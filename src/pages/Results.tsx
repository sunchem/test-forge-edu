import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Trophy, TrendingUp, BookOpen } from 'lucide-react';

export default function Results() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
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
          navigate('/teacher/results');
          return;
        } else if (profile.role === 'student') {
          navigate('/student/tests'); // Students see their results in tests page
          return;
        }
      }
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
          <h1 className="text-3xl font-bold text-foreground">Результаты</h1>
          <p className="text-muted-foreground">Ваши академические достижения</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Нет результатов</h3>
            <p className="text-muted-foreground text-center">
              Пройдите тесты, чтобы увидеть свои результаты
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}