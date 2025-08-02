import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Clock, Users, PlayCircle } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  time_limit_minutes: number;
  is_active: boolean;
  quarter: string;
  academic_year: string;
  created_at: string;
}

export default function Tests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadTests();
  }, []);

  const checkAuthAndLoadTests = async () => {
    try {
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

      if (profile) {
        setUserRole(profile.role);
        
        // Redirect based on role
        if (profile.role === 'admin') {
          navigate('/admin/stats');
          return;
        } else if (profile.role === 'teacher') {
          navigate('/teacher/tests');
          return;
        } else if (profile.role === 'student') {
          navigate('/student/tests');
          return;
        }
      }

      loadTests();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить тесты",
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Доступные тесты</h1>
          <p className="text-muted-foreground">Выберите тест для прохождения</p>
        </div>

        {tests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Нет доступных тестов</h3>
              <p className="text-muted-foreground text-center">
                В данный момент нет активных тестов для прохождения
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <Card key={test.id} className="shadow-card hover:shadow-elevation transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <Badge variant="secondary">
                      {test.quarter} четверть
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2">{test.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {test.description || 'Описание отсутствует'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{test.total_questions} вопросов</span>
                    </div>
                    {test.time_limit_minutes && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{test.time_limit_minutes} мин</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2">
                    <Button className="w-full" size="sm">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Начать тест
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}