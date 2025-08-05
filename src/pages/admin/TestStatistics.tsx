import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Download, Users, BookOpen, TrendingUp, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

interface TestResult {
  id: string;
  test_title: string;
  student_name: string;
  class_name: string;
  total_score: number;
  max_score: number;
  percentage_score: number;
  completed_at: string;
  quarter: string;
  academic_year: string;
}

interface ClassStats {
  class_name: string;
  class_id: string;
  total_students: number;
  completed_tests: number;
  average_score: number;
}

export default function TestStatistics() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClass || selectedTest) {
      loadResults();
    }
  }, [selectedClass, selectedTest]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (!profile || !['admin', 'school_admin'].includes(profile.role)) {
      navigate('/dashboard');
      return;
    }
  };

  const loadData = async () => {
    try {
      const [classesResponse, testsResponse] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .order('grade', { ascending: true }),
        supabase
          .from('tests')
          .select('id, title, quarter, academic_year')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      ]);

      if (classesResponse.error) throw classesResponse.error;
      if (testsResponse.error) throw testsResponse.error;

      setClasses(classesResponse.data || []);
      setTests(testsResponse.data || []);

      await loadClassStats();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClassStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) return;

      // Get class statistics
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', profile.school_id);

      if (!classesData) return;

      const stats: ClassStats[] = [];

      for (const cls of classesData) {
        // Count students in class
        const { count: studentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('school_id', profile.school_id);

        // Count completed tests for this class
        const { count: completedCount } = await supabase
          .from('test_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('is_completed', true);

        // Calculate average score
        const { data: avgData } = await supabase
          .from('test_attempts')
          .select('percentage_score')
          .eq('is_completed', true);

        const avgScore = avgData && avgData.length > 0 
          ? avgData.reduce((sum, attempt) => sum + (attempt.percentage_score || 0), 0) / avgData.length
          : 0;

        stats.push({
          class_name: cls.name,
          class_id: cls.id,
          total_students: studentCount || 0,
          completed_tests: completedCount || 0,
          average_score: avgScore
        });
      }

      setClassStats(stats);
    } catch (error) {
      console.error('Error loading class stats:', error);
    }
  };

  const loadResults = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) return;

      let query = supabase
        .from('test_attempts')
        .select(`
          id,
          total_score,
          max_score,
          percentage_score,
          completed_at,
          quarter,
          academic_year,
          tests (
            title,
            class_id
          ),
          profiles:student_id (
            first_name,
            last_name
          )
        `)
        .eq('is_completed', true);

      if (selectedTest) {
        query = query.eq('test_id', selectedTest);
      }

      const { data: attemptsData, error } = await query.order('completed_at', { ascending: false });

      if (error) throw error;

      // Get class information for filtering
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', profile.school_id);

      const classMap = new Map(classesData?.map(c => [c.id, c.name]) || []);

      let filteredResults = attemptsData?.map(attempt => ({
        id: attempt.id,
        test_title: attempt.tests?.title || 'Неизвестный тест',
        student_name: `${attempt.profiles?.first_name || ''} ${attempt.profiles?.last_name || ''}`.trim(),
        class_name: classMap.get(attempt.tests?.class_id) || 'Неизвестный класс',
        class_id: attempt.tests?.class_id || '',
        total_score: attempt.total_score || 0,
        max_score: attempt.max_score || 0,
        percentage_score: attempt.percentage_score || 0,
        completed_at: attempt.completed_at || '',
        quarter: attempt.quarter || '',
        academic_year: attempt.academic_year || ''
      })) || [];

      // Filter by selected class if needed
      if (selectedClass) {
        filteredResults = filteredResults.filter(result => result.class_id === selectedClass);
      }

      setResults(filteredResults);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить результаты",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    if (results.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нет результатов для экспорта",
        variant: "destructive",
      });
      return;
    }

    const exportData = results.map(result => ({
      'Тест': result.test_title,
      'Ученик': result.student_name,
      'Класс': result.class_name,
      'Баллы': `${result.total_score}/${result.max_score}`,
      'Процент': `${result.percentage_score.toFixed(1)}%`,
      'Дата завершения': new Date(result.completed_at).toLocaleDateString('ru-RU'),
      'Четверть': result.quarter,
      'Учебный год': result.academic_year
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Результаты тестов');
    
    const fileName = selectedClass 
      ? `Результаты_${classes.find(c => c.id === selectedClass)?.name || 'класс'}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '_')}.xlsx`
      : `Результаты_всех_классов_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '_')}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Экспорт завершен",
      description: "Файл Excel успешно создан",
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Статистика тестов</h1>
            <p className="text-muted-foreground">Просмотр результатов и экспорт данных</p>
          </div>
          
          <Button onClick={exportToExcel} disabled={results.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт в Excel
          </Button>
        </div>

        {/* Class Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего классов</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classStats.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Пройденных тестов</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {classStats.reduce((sum, stat) => sum + stat.completed_tests, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Средний балл</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {classStats.length > 0 
                  ? (classStats.reduce((sum, stat) => sum + stat.average_score, 0) / classStats.length).toFixed(1)
                  : '0.0'
                }%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Класс</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все классы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все классы</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.grade} класс)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Тест</label>
                <Select value={selectedTest} onValueChange={setSelectedTest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все тесты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все тесты</SelectItem>
                    {tests.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Результаты тестов ({results.length})
            </CardTitle>
            <CardDescription>
              Подробные результаты по всем пройденным тестам
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет результатов для отображения</p>
                <p className="text-sm">Измените фильтры или дождитесь прохождения тестов</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тест</TableHead>
                    <TableHead>Ученик</TableHead>
                    <TableHead>Класс</TableHead>
                    <TableHead>Баллы</TableHead>
                    <TableHead>Процент</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Четверть</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.test_title}</TableCell>
                      <TableCell>{result.student_name}</TableCell>
                      <TableCell>{result.class_name}</TableCell>
                      <TableCell>
                        <span className={getScoreColor(result.percentage_score)}>
                          {result.total_score}/{result.max_score}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getScoreBadge(result.percentage_score)}>
                          {result.percentage_score.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(result.completed_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>{result.quarter || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}