import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save, BookOpen, Trash2, Check } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  options: {
    id: string;
    option_text: string;
    is_correct: boolean;
  }[];
}

export default function CreateTest() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    quarter: '',
    academic_year: new Date().getFullYear().toString()
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
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
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, school_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) return;

      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', profile.id);

      setClasses(classesData || []);
      if (classesData && classesData.length > 0) {
        setSelectedClassId(classesData[0].id);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      question_text: '',
      options: [
        { id: crypto.randomUUID(), option_text: '', is_correct: false },
        { id: crypto.randomUUID(), option_text: '', is_correct: false }
      ]
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const updateQuestion = (questionId: string, field: string, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? {
        ...q,
        options: [...q.options, { id: crypto.randomUUID(), option_text: '', is_correct: false }]
      } : q
    ));
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? {
        ...q,
        options: q.options.filter(o => o.id !== optionId)
      } : q
    ));
  };

  const updateOption = (questionId: string, optionId: string, field: string, value: string | boolean) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? {
        ...q,
        options: q.options.map(o => 
          o.id === optionId ? { ...o, [field]: value } : o
        )
      } : q
    ));
  };

  const setCorrectOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? {
        ...q,
        options: q.options.map(o => ({
          ...o,
          is_correct: o.id === optionId
        }))
      } : q
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (questions.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы один вопрос",
        variant: "destructive",
      });
      return;
    }

    // Validate questions
    for (const question of questions) {
      if (!question.question_text.trim()) {
        toast({
          title: "Ошибка",
          description: "Все вопросы должны содержать текст",
          variant: "destructive",
        });
        return;
      }
      
      if (question.options.length < 2) {
        toast({
          title: "Ошибка",
          description: "Каждый вопрос должен содержать минимум 2 варианта ответа",
          variant: "destructive",
        });
        return;
      }

      const hasCorrectAnswer = question.options.some(o => o.is_correct);
      if (!hasCorrectAnswer) {
        toast({
          title: "Ошибка",
          description: "Для каждого вопроса должен быть указан правильный ответ",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, school_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) throw new Error('Профиль не найден');

      // Create test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert([{
          title: formData.title,
          description: formData.description,
          quarter: formData.quarter,
          academic_year: formData.academic_year,
          teacher_id: profile.id,
          school_id: profile.school_id,
          class_id: selectedClassId,
          total_questions: questions.length,
          is_active: true
        }])
        .select()
        .single();

      if (testError) throw testError;

      // Create questions and options
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert([{
            test_id: testData.id,
            question_text: question.question_text,
            question_order: i + 1,
            question_type: 'multiple_choice',
            points: 1
          }])
          .select()
          .single();

        if (questionError) throw questionError;

        // Create options
        for (let j = 0; j < question.options.length; j++) {
          const option = question.options[j];
          
          const { error: optionError } = await supabase
            .from('question_options')
            .insert([{
              question_id: questionData.id,
              option_text: option.option_text,
              option_order: j + 1,
              is_correct: option.is_correct
            }]);

          if (optionError) throw optionError;
        }
      }

      toast({
        title: "Успешно",
        description: "Тест создан с вопросами",
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Создать новый тест</h1>
            <p className="text-muted-foreground">Создайте тест с вопросами множественного выбора</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Test Info */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Информация о тесте
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="subject">Предмет *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Математика, Русский язык и т.д."
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Описание теста и инструкции для учеников"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div>
                    <Label htmlFor="class">Класс</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Вопросы ({questions.length})</CardTitle>
                  <Button type="button" onClick={addQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить вопрос
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет вопросов. Нажмите "Добавить вопрос" чтобы начать.</p>
                  </div>
                ) : (
                  questions.map((question, questionIndex) => (
                    <Card key={question.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <Label className="text-base font-semibold">
                            Вопрос {questionIndex + 1}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={question.question_text}
                          onChange={(e) => updateQuestion(question.id, 'question_text', e.target.value)}
                          placeholder="Введите текст вопроса"
                          rows={3}
                        />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-medium">Варианты ответов</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addOption(question.id)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить вариант
                          </Button>
                        </div>
                        
                        {question.options.map((option, optionIndex) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant={option.is_correct ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCorrectOption(question.id, option.id)}
                              className="min-w-[100px]"
                            >
                              {option.is_correct ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Правильный
                                </>
                              ) : (
                                `Вариант ${optionIndex + 1}`
                              )}
                            </Button>
                            <Input
                              value={option.option_text}
                              onChange={(e) => updateOption(question.id, option.id, 'option_text', e.target.value)}
                              placeholder={`Вариант ответа ${optionIndex + 1}`}
                              className="flex-1"
                            />
                            {question.options.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(question.id, option.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Submit */}
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
        </div>
      </main>
    </div>
  );
}