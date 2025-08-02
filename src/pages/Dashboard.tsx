import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Plus, 
  School,
  ClipboardList,
  TrendingUp,
  Clock
} from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'teacher' | 'student' | 'school_admin';
  school_id?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      setUser(session.user);
      
      // Get user profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить профиль",
          variant: "destructive",
        });
      } else {
        setProfile(profileData);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

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

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'school_admin': return 'Администратор школы';
      case 'teacher': return 'Учитель';
      case 'student': return 'Ученик';
      default: return 'Пользователь';
    }
  };

  const getQuickActions = () => {
    switch (profile?.role) {
      case 'admin':
        return [
          { icon: <School className="h-5 w-5" />, title: "Управление школами", description: "Добавить или редактировать школы", action: () => navigate('/admin/schools') },
          { icon: <Users className="h-5 w-5" />, title: "Управление пользователями", description: "Добавить учителей и учеников", action: () => navigate('/admin/users') },
          { icon: <BarChart3 className="h-5 w-5" />, title: "Общая статистика", description: "Просмотр статистики по всем школам", action: () => navigate('/admin/stats') },
        ];
      case 'school_admin':
        return [
          { icon: <Users className="h-5 w-5" />, title: "Управление пользователями", description: "Добавить учителей и учеников", action: () => navigate('/admin/users') },
          { icon: <BarChart3 className="h-5 w-5" />, title: "Статистика школы", description: "Просмотр статистики по школе", action: () => navigate('/admin/stats') },
        ];
      case 'teacher':
        return [
          { icon: <Plus className="h-5 w-5" />, title: "Создать тест", description: "Создать новый тест для учеников", action: () => navigate('/teacher/create-test') },
          { icon: <ClipboardList className="h-5 w-5" />, title: "Мои тесты", description: "Просмотр и редактирование тестов", action: () => navigate('/teacher/tests') },
          { icon: <Users className="h-5 w-5" />, title: "Мои классы", description: "Управление классами и учениками", action: () => navigate('/teacher/classes') },
          { icon: <BarChart3 className="h-5 w-5" />, title: "Результаты", description: "Просмотр результатов тестов", action: () => navigate('/teacher/results') },
        ];
      case 'student':
        return [
          { icon: <BookOpen className="h-5 w-5" />, title: "Доступные тесты", description: "Пройти назначенные тесты", action: () => navigate('/student/tests') },
          { icon: <BarChart3 className="h-5 w-5" />, title: "Мои результаты", description: "Посмотреть результаты тестов", action: () => navigate('/student/results') },
          { icon: <Clock className="h-5 w-5" />, title: "История", description: "История прохождения тестов", action: () => navigate('/student/history') },
        ];
      default:
        return [];
    }
  };

  const getDashboardStats = () => {
    // Заглушка для статистики - в реальном приложении здесь будут данные из БД
    switch (profile?.role) {
      case 'admin':
        return [
          { title: "Школы", value: "0", icon: <School className="h-6 w-6" /> },
          { title: "Учителя", value: "0", icon: <Users className="h-6 w-6" /> },
          { title: "Ученики", value: "0", icon: <Users className="h-6 w-6" /> },
          { title: "Тестов всего", value: "0", icon: <BookOpen className="h-6 w-6" /> },
        ];
      case 'teacher':
        return [
          { title: "Мои классы", value: "0", icon: <Users className="h-6 w-6" /> },
          { title: "Мои тесты", value: "0", icon: <BookOpen className="h-6 w-6" /> },
          { title: "Учеников", value: "0", icon: <Users className="h-6 w-6" /> },
          { title: "Пройдено тестов", value: "0", icon: <TrendingUp className="h-6 w-6" /> },
        ];
      case 'student':
        return [
          { title: "Доступно тестов", value: "0", icon: <BookOpen className="h-6 w-6" /> },
          { title: "Пройдено", value: "0", icon: <TrendingUp className="h-6 w-6" /> },
          { title: "Средний балл", value: "0%", icon: <BarChart3 className="h-6 w-6" /> },
          { title: "В ожидании", value: "0", icon: <Clock className="h-6 w-6" /> },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Добро пожаловать, {profile?.first_name} {profile?.last_name}!
          </h1>
          <p className="text-muted-foreground">
            Вы вошли как {getRoleTitle(profile?.role || '')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {getDashboardStats().map((stat, index) => (
            <Card key={index} className="shadow-card hover:shadow-elevation transition-all duration-300">
              <CardContent className="flex items-center p-6">
                <div className="text-primary mr-4">{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
            <CardDescription>
              Часто используемые функции для вашей роли
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getQuickActions().map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-4 justify-start"
                  onClick={action.action}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-primary mt-1">{action.icon}</div>
                    <div className="text-left">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-sm text-muted-foreground">{action.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-8 bg-primary-light/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Нужна помощь?</h3>
                <p className="text-muted-foreground">
                  Ознакомьтесь с нашим руководством пользователя или свяжитесь с поддержкой
                </p>
              </div>
              <Button variant="outline" className="ml-auto">
                Справка
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}