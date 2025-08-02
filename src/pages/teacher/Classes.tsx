import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, GraduationCap } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  grade?: number;
  subject?: string;
  academic_year: string;
  created_at: string;
}

export default function TeacherClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
    loadClasses();
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

  const loadClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) throw new Error('Профиль не найден');

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить классы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-bold text-foreground">Мои классы</h1>
            <p className="text-muted-foreground">Управление классами и учениками</p>
          </div>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить класс
          </Button>
        </div>

        {classes.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Нет назначенных классов</h3>
              <p className="text-muted-foreground text-center mb-6">
                Обратитесь к администратору для назначения классов
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <Card key={classItem.id} className="shadow-card hover:shadow-elevation transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Users className="h-6 w-6 text-primary" />
                    {classItem.grade && (
                      <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {classItem.grade} класс
                      </span>
                    )}
                  </div>
                  <CardTitle>{classItem.name}</CardTitle>
                  <CardDescription>
                    {classItem.subject && `${classItem.subject} • `}
                    {classItem.academic_year} учебный год
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                    <span>Учеников: 0</span>
                    <span>Тестов: 0</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Управление классом
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