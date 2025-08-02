import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, BookOpen } from 'lucide-react';

export default function CreateTest() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time_limit_minutes: '',
    quarter: '',
    academic_year: new Date().getFullYear().toString()
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, school_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) throw new Error('Профиль не найден');

      const { data, error } = await supabase
        .from('tests')
        .insert([{
          ...formData,
          teacher_id: profile.id,
          school_id: profile.school_id,
          class_id: 'default-class', // TODO: Implement class selection
          time_limit_minutes: formData.time_limit_minutes ? parseInt(formData.time_limit_minutes) : null
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Тест создан",
      });

      navigate('/teacher/tests');
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать тест",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Создать новый тест</h1>
            <p className="text-muted-foreground">Заполните основную информацию о тесте</p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Информация о тесте
              </CardTitle>
              <CardDescription>
                Укажите название, описание и основные параметры тестирования
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="title">Название теста *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Введите название теста"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Описание теста и инструкции для учеников"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="time_limit_minutes">Время (минуты)</Label>
                    <Input
                      id="time_limit_minutes"
                      type="number"
                      value={formData.time_limit_minutes}
                      onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value })}
                      placeholder="60"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="quarter">Четверть</Label>
                    <Input
                      id="quarter"
                      value={formData.quarter}
                      onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                      placeholder="1, 2, 3, 4"
                    />
                  </div>

                  <div>
                    <Label htmlFor="academic_year">Учебный год</Label>
                    <Input
                      id="academic_year"
                      value={formData.academic_year}
                      onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                      placeholder="2024"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/teacher/tests')}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Создать тест
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}