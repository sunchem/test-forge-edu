import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Plus, Clock, Users, Settings, CheckSquare } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Test {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  quarter: string;
  academic_year: string;
  teacher_id: string;
  is_active: boolean;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface Class {
  id: string;
  name: string;
  grade: number;
}

export default function AdminTestManagement() {
  const [tests, setTests] = useState<Test[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [combinedTestData, setCombinedTestData] = useState({
    title: '',
    description: '',
    time_limit_minutes: '',
    quarter: '',
    academic_year: new Date().getFullYear().toString()
  });
  const [selectedClassForAssignment, setSelectedClassForAssignment] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
    loadData();
  }, []);

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
      const [testsResponse, classesResponse] = await Promise.all([
        supabase
          .from('tests')
          .select(`
            *,
            profiles:teacher_id (
              first_name,
              last_name
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('classes')
          .select('*')
          .order('grade', { ascending: true })
      ]);

      if (testsResponse.error) throw testsResponse.error;
      if (classesResponse.error) throw classesResponse.error;

      setTests(testsResponse.data || []);
      setClasses(classesResponse.data || []);
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

  const handleTestSelection = (testId: string, checked: boolean) => {
    if (checked) {
      setSelectedTests([...selectedTests, testId]);
    } else {
      setSelectedTests(selectedTests.filter(id => id !== testId));
    }
  };

  const handleCreateCombinedTest = async () => {
    if (selectedTests.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите хотя бы один тест для объединения",
        variant: "destructive",
      });
      return;
    }

    if (!selectedClassForAssignment) {
      toast({
        title: "Ошибка",
        description: "Выберите класс для назначения теста",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, school_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) throw new Error('Профиль не найден');

      // Get total questions from selected tests
      const selectedTestsData = tests.filter(t => selectedTests.includes(t.id));
      const totalQuestions = selectedTestsData.reduce((sum, test) => sum + test.total_questions, 0);

      // Create combined test
      const { data: combinedTest, error: testError } = await supabase
        .from('tests')
        .insert([{
          title: combinedTestData.title,
          description: combinedTestData.description,
          quarter: combinedTestData.quarter,
          academic_year: combinedTestData.academic_year,
          teacher_id: profile.id,
          school_id: profile.school_id,
          class_id: selectedClassForAssignment,
          total_questions: totalQuestions,
          time_limit_minutes: combinedTestData.time_limit_minutes ? parseInt(combinedTestData.time_limit_minutes) : null,
          is_active: true
        }])
        .select()
        .single();

      if (testError) throw testError;

      // Copy questions and options from selected tests
      let questionOrder = 1;
      
      for (const testId of selectedTests) {
        const testData = tests.find(t => t.id === testId);
        
        // Get questions for this test
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select(`
            *,
            question_options (*)
          `)
          .eq('test_id', testId)
          .order('question_order');

        if (questionsError) throw questionsError;

        // Copy questions with subject prefix
        for (const question of questions || []) {
          const { data: newQuestion, error: questionError } = await supabase
            .from('questions')
            .insert([{
              test_id: combinedTest.id,
              question_text: `[${testData?.title || 'Тест'}] ${question.question_text}`,
              question_order: questionOrder++,
              question_type: question.question_type,
              points: question.points
            }])
            .select()
            .single();

          if (questionError) throw questionError;

          // Copy options
          for (const option of question.question_options || []) {
            const { error: optionError } = await supabase
              .from('question_options')
              .insert([{
                question_id: newQuestion.id,
                option_text: option.option_text,
                option_order: option.option_order,
                is_correct: option.is_correct
              }]);

            if (optionError) throw optionError;
          }
        }
      }

      // Get students from the selected class and create assignments
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .eq('school_id', profile.school_id);

      if (studentsError) throw studentsError;

      // Create test assignments for all students in the school
      const assignments = students?.map(student => ({
        test_id: combinedTest.id,
        student_id: student.id,
        assigned_at: new Date().toISOString()
      })) || [];

      if (assignments.length > 0) {
        const { error: assignmentError } = await supabase
          .from('test_assignments')
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      toast({
        title: "Успешно",
        description: `Объединенный тест создан и назначен ${assignments.length} студентам`,
      });

      setIsDialogOpen(false);
      setSelectedTests([]);
      setCombinedTestData({
        title: '',
        description: '',
        time_limit_minutes: '',
        quarter: '',
        academic_year: new Date().getFullYear().toString()
      });
      setSelectedClassForAssignment('');
      loadData();

    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать объединенный тест",
        variant: "destructive",
      });
    }
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
            <h1 className="text-3xl font-bold text-foreground">Управление тестами</h1>
            <p className="text-muted-foreground">Объединяйте тесты и назначайте их студентам</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={selectedTests.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Создать объединенный тест ({selectedTests.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Создать объединенный тест</DialogTitle>
                <DialogDescription>
                  Объедините выбранные тесты в один комплексный тест
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Название объединенного теста *</Label>
                  <Input
                    id="title"
                    value={combinedTestData.title}
                    onChange={(e) => setCombinedTestData({ ...combinedTestData, title: e.target.value })}
                    placeholder="Комплексный тест по всем предметам"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={combinedTestData.description}
                    onChange={(e) => setCombinedTestData({ ...combinedTestData, description: e.target.value })}
                    placeholder="Описание объединенного теста"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="time_limit">Время на тест (минуты)</Label>
                    <Input
                      id="time_limit"
                      type="number"
                      value={combinedTestData.time_limit_minutes}
                      onChange={(e) => setCombinedTestData({ ...combinedTestData, time_limit_minutes: e.target.value })}
                      placeholder="120"
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quarter">Четверть</Label>
                    <Input
                      id="quarter"
                      value={combinedTestData.quarter}
                      onChange={(e) => setCombinedTestData({ ...combinedTestData, quarter: e.target.value })}
                      placeholder="1, 2, 3, 4"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="class">Назначить классу *</Label>
                  <Select value={selectedClassForAssignment} onValueChange={setSelectedClassForAssignment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите класс" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} ({cls.grade} класс)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg p-4">
                  <Label className="text-sm font-medium">Выбранные тесты:</Label>
                  <div className="mt-2 space-y-2">
                    {selectedTests.map(testId => {
                      const test = tests.find(t => t.id === testId);
                      return (
                        <div key={testId} className="flex justify-between items-center text-sm">
                          <span>{test?.title}</span>
                          <span>{test?.total_questions} вопросов</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Общее количество вопросов:</span>
                      <span>{tests.filter(t => selectedTests.includes(t.id)).reduce((sum, test) => sum + test.total_questions, 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreateCombinedTest}>
                    Создать объединенный тест
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Доступные тесты
            </CardTitle>
            <CardDescription>
              Выберите тесты для объединения. Тесты будут объединены в том порядке, в котором они указаны в таблице.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет доступных тестов для объединения</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTests.length === tests.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTests(tests.map(t => t.id));
                          } else {
                            setSelectedTests([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Название теста</TableHead>
                    <TableHead>Учитель</TableHead>
                    <TableHead>Вопросов</TableHead>
                    <TableHead>Четверть</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTests.includes(test.id)}
                          onCheckedChange={(checked) => handleTestSelection(test.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{test.title}</TableCell>
                      <TableCell>{test.profiles?.first_name} {test.profiles?.last_name}</TableCell>
                      <TableCell>{test.total_questions}</TableCell>
                      <TableCell>{test.quarter || '-'}</TableCell>
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