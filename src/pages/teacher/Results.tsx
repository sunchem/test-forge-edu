import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, TrendingUp, Award, Clock } from 'lucide-react';

interface TestResult {
  id: string;
  student_name: string;
  test_title: string;
  percentage_score: number;
  total_score: number;
  max_score: number;
  completed_at: string;
  is_completed: boolean;
}

export default function TeacherResults() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    completedTests: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
    loadResults();
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

    if (profile?.role !== 'teacher') {
      navigate('/dashboard');
      return;
    }
  };

  const loadResults = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) throw new Error('Профиль не найден');

      // Load test attempts for teacher's tests
      const { data, error } = await supabase
        .from('test_attempts')
        .select(`
          id,
          percentage_score,
          total_score,
          max_score,
          completed_at,
          is_completed,
          tests!inner(
            id,
            title,
            teacher_id
          ),
          profiles!inner(
            first_name,
            last_name
          )
        `)
        .eq('tests.teacher_id', profile.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedResults = (data || []).map((attempt: any) => ({
        id: attempt.id,
        student_name: `${attempt.profiles.first_name} ${attempt.profiles.last_name}`,
        test_title: attempt.tests.title,
        percentage_score: attempt.percentage_score || 0,
        total_score: attempt.total_score || 0,
        max_score: attempt.max_score || 0,
        completed_at: attempt.completed_at,
        is_completed: attempt.is_completed
      }));

      setResults(formattedResults);

      // Calculate stats
      const completedAttempts = formattedResults.filter(r => r.is_completed);
      const averageScore = completedAttempts.length > 0 
        ? completedAttempts.reduce((sum, r) => sum + r.percentage_score, 0) / completedAttempts.length
        : 0;

      setStats({
        totalAttempts: formattedResults.length,
        averageScore,
        completedTests: completedAttempts.length
      });

    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить результаты",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Результаты тестов</h1>
          <p className="text-muted-foreground">Статистика по прохождению ваших тестов</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardContent className="flex items-center p-6">
              <BarChart3 className="h-8 w-8 text-primary mr-4" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalAttempts}</p>
                <p className="text-sm text-muted-foreground">Всего попыток</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="flex items-center p-6">
              <Award className="h-8 w-8 text-primary mr-4" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.averageScore.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Средний балл</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="flex items-center p-6">
              <TrendingUp className="h-8 w-8 text-primary mr-4" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.completedTests}</p>
                <p className="text-sm text-muted-foreground">Завершено тестов</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Детальные результаты</CardTitle>
            <CardDescription>
              Результаты прохождения тестов учениками
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Нет результатов</h3>
                <p className="text-muted-foreground">Ученики ещё не проходили ваши тесты</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{result.student_name}</h4>
                      <p className="text-sm text-muted-foreground">{result.test_title}</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${getScoreColor(result.percentage_score)}`}>
                        {result.percentage_score.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.total_score}/{result.max_score} баллов
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {result.is_completed ? 'Завершён' : 'В процессе'}
                      </p>
                      {result.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(result.completed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}