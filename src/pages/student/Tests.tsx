import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Clock, Play, CheckCircle } from 'lucide-react';

interface AvailableTest {
  id: string;
  title: string;
  description?: string;
  time_limit_minutes?: number;
  total_questions: number;
  quarter?: string;
  academic_year: string;
  due_date?: string;
  has_attempted: boolean;
  is_completed: boolean;
  last_score?: number;
}

export default function StudentTests() {
  const [tests, setTests] = useState<AvailableTest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
    loadAvailableTests();
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

    if (profile?.role !== 'student') {
      navigate('/dashboard');
      return;
    }
  };

  const loadAvailableTests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) throw new Error('Профиль не найден');

      // Load test assignments for this student
      const { data: assignments, error: assignmentsError } = await supabase
        .from('test_assignments')
        .select(`
          id,
          due_date,
          tests!inner(
            id,
            title,
            description,
            time_limit_minutes,
            total_questions,
            quarter,
            academic_year
          )
        `)
        .eq('student_id', profile.id);

      if (assignmentsError) throw assignmentsError;

      // Load existing attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select('test_id, is_completed, percentage_score')
        .eq('student_id', profile.id);

      if (attemptsError) throw attemptsError;

      // Combine data
      const formattedTests = (assignments || []).map((assignment: any) => {
        const test = assignment.tests;
        const attempt = attempts?.find(a => a.test_id === test.id);
        
        return {
          id: test.id,
          title: test.title,
          description: test.description,
          time_limit_minutes: test.time_limit_minutes,
          total_questions: test.total_questions,
          quarter: test.quarter,
          academic_year: test.academic_year,
          due_date: assignment.due_date,
          has_attempted: !!attempt,
          is_completed: attempt?.is_completed || false,
          last_score: attempt?.percentage_score
        };
      });

      setTests(formattedTests);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить тесты",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startTest = (testId: string) => {
    // TODO: Navigate to test taking interface
    toast({
      title: "Функция в разработке",
      description: "Интерфейс прохождения тестов будет добавлен позже",
    });
  };

  const getTestStatus = (test: AvailableTest) => {
    if (test.is_completed) {
      return {
        status: 'Завершён',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    if (test.has_attempted) {
      return {
        status: 'В процессе',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-4 w-4" />
      };
    }
    return {
      status: 'Доступен',
      color: 'bg-blue-100 text-blue-800',
      icon: <Play className="h-4 w-4" />
    };
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
          <h1 className="text-3xl font-bold text-foreground">Доступные тесты</h1>
          <p className="text-muted-foreground">Тесты, назначенные вашими учителями</p>
        </div>

        {tests.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Нет доступных тестов</h3>
              <p className="text-muted-foreground text-center">
                Учителя ещё не назначили вам тесты для прохождения
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => {
              const status = getTestStatus(test);
              
              return (
                <Card key={test.id} className="shadow-card hover:shadow-elevation transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <BookOpen className="h-6 w-6 text-primary" />
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${status.color}`}>
                          {status.icon}
                          <span>{status.status}</span>
                        </span>
                      </div>
                    </div>
                    <CardTitle className="line-clamp-2">{test.title}</CardTitle>
                    <CardDescription>
                      {test.quarter && `${test.quarter} четверть • `}
                      {test.academic_year} год
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {test.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {test.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Вопросов:</span>
                        <span className="font-medium">{test.total_questions}</span>
                      </div>
                      {test.time_limit_minutes && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Время:</span>
                          <span className="font-medium">{test.time_limit_minutes} мин</span>
                        </div>
                      )}
                      {test.due_date && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Срок:</span>
                          <span className="font-medium">
                            {new Date(test.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {test.last_score !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Результат:</span>
                          <span className="font-medium text-primary">
                            {test.last_score.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      disabled={test.is_completed}
                      onClick={() => startTest(test.id)}
                    >
                      {test.is_completed ? 'Завершён' : test.has_attempted ? 'Продолжить' : 'Начать тест'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}