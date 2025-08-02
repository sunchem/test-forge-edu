import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { School, Users, BookOpen, TrendingUp, Clock, Award } from 'lucide-react';

interface Stats {
  totalSchools: number;
  totalTeachers: number;
  totalStudents: number;
  totalTests: number;
  totalAttempts: number;
  averageScore: number;
}

export default function AdminStats() {
  const [stats, setStats] = useState<Stats>({
    totalSchools: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalTests: 0,
    totalAttempts: 0,
    averageScore: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
    loadStats();
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

    if (profile?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
  };

  const loadStats = async () => {
    try {
      const [
        schoolsResponse,
        teachersResponse,
        studentsResponse,
        testsResponse,
        attemptsResponse
      ] = await Promise.all([
        supabase.from('schools').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'teacher'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('tests').select('id', { count: 'exact' }),
        supabase.from('test_attempts').select('percentage_score', { count: 'exact' })
      ]);

      const attempts = attemptsResponse.data || [];
      const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.percentage_score || 0), 0);
      const averageScore = attempts.length > 0 ? totalScore / attempts.length : 0;

      setStats({
        totalSchools: schoolsResponse.count || 0,
        totalTeachers: teachersResponse.count || 0,
        totalStudents: studentsResponse.count || 0,
        totalTests: testsResponse.count || 0,
        totalAttempts: attemptsResponse.count || 0,
        averageScore: averageScore
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить статистику",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Школы",
      value: stats.totalSchools.toString(),
      icon: <School className="h-6 w-6" />,
      description: "Общее количество школ"
    },
    {
      title: "Учителя",
      value: stats.totalTeachers.toString(),
      icon: <Users className="h-6 w-6" />,
      description: "Зарегистрированные учителя"
    },
    {
      title: "Ученики",
      value: stats.totalStudents.toString(),
      icon: <Users className="h-6 w-6" />,
      description: "Зарегистрированные ученики"
    },
    {
      title: "Тесты",
      value: stats.totalTests.toString(),
      icon: <BookOpen className="h-6 w-6" />,
      description: "Созданные тесты"
    },
    {
      title: "Попытки",
      value: stats.totalAttempts.toString(),
      icon: <Clock className="h-6 w-6" />,
      description: "Всего попыток прохождения"
    },
    {
      title: "Средний балл",
      value: `${stats.averageScore.toFixed(1)}%`,
      icon: <Award className="h-6 w-6" />,
      description: "Средний результат по всем тестам"
    }
  ];

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Общая статистика</h1>
          <p className="text-muted-foreground">Обзор статистики по всем школам в системе</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className="shadow-card hover:shadow-elevation transition-all duration-300">
              <CardContent className="flex items-center p-6">
                <div className="text-primary mr-4">{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm font-medium text-foreground">{stat.title}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Аналитика платформы
            </CardTitle>
            <CardDescription>
              Общие показатели эффективности системы тестирования
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-primary-light/10 rounded-lg">
                <span className="font-medium">Активность пользователей</span>
                <span className="text-primary font-bold">
                  {((stats.totalAttempts / Math.max(stats.totalStudents, 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-primary-light/10 rounded-lg">
                <span className="font-medium">Среднее количество тестов на учителя</span>
                <span className="text-primary font-bold">
                  {(stats.totalTests / Math.max(stats.totalTeachers, 1)).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-primary-light/10 rounded-lg">
                <span className="font-medium">Среднее количество учеников на школу</span>
                <span className="text-primary font-bold">
                  {(stats.totalStudents / Math.max(stats.totalSchools, 1)).toFixed(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}