import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Edit, Trash2, Eye } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description?: string;
  quarter?: string;
  academic_year: string;
  total_questions: number;
  time_limit_minutes?: number;
  is_active: boolean;
  created_at: string;
}

export default function TeacherTests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
    loadTests();
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

  const loadTests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) throw new Error('Профиль не найден');

      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
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

  const toggleTestStatus = async (testId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ is_active: !currentStatus })
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: `Тест ${!currentStatus ? 'активирован' : 'деактивирован'}`,
      });

      loadTests();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус теста",
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
            <h1 className="text-3xl font-bold text-foreground">Мои тесты</h1>
            <p className="text-muted-foreground">Управление созданными тестами</p>
          </div>
          
          <Button onClick={() => navigate('/teacher/create-test')}>
            <Plus className="h-4 w-4 mr-2" />
            Создать тест
          </Button>
        </div>

        {tests.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Нет созданных тестов</h3>
              <p className="text-muted-foreground text-center mb-6">
                Создайте свой первый тест для учеников
              </p>
              <Button onClick={() => navigate('/teacher/create-test')}>
                <Plus className="h-4 w-4 mr-2" />
                Создать первый тест
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <Card key={test.id} className="shadow-card hover:shadow-elevation transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        test.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {test.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                    <span>Вопросов: {test.total_questions}</span>
                    {test.time_limit_minutes && (
                      <span>Время: {test.time_limit_minutes} мин</span>
                    )}
                  </div>
                  <Button
                    variant={test.is_active ? "outline" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={() => toggleTestStatus(test.id, test.is_active)}
                  >
                    {test.is_active ? 'Деактивировать' : 'Активировать'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}