import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Clock, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Question {
  id: string;
  question_text: string;
  question_order: number;
  points: number;
  question_options: {
    id: string;
    option_text: string;
    option_order: number;
    is_correct: boolean;
  }[];
}

interface Test {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  time_limit_minutes: number | null;
  quarter: string;
  academic_year: string;
}

export default function TakeTest() {
  const { testId } = useParams();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{[questionId: string]: string}>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (testId) {
      checkAccess();
      loadTest();
    }
  }, [testId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (testStarted && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testStarted, timeLeft]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('user_id', session.user.id)
      .single();

    if (profile?.role !== 'student') {
      navigate('/dashboard');
      return;
    }

    // Check if student has access to this test
    const { data: assignment } = await supabase
      .from('test_assignments')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', profile.id)
      .single();

    if (!assignment) {
      toast({
        title: "Доступ запрещен",
        description: "У вас нет доступа к этому тесту",
        variant: "destructive",
      });
      navigate('/student/tests');
      return;
    }

    // Check if test already completed
    const { data: attempt } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', profile.id)
      .eq('is_completed', true)
      .single();

    if (attempt) {
      toast({
        title: "Тест уже пройден",
        description: "Вы уже прошли этот тест",
        variant: "destructive",
      });
      navigate('/student/tests');
      return;
    }
  };

  const loadTest = async () => {
    try {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          question_options (*)
        `)
        .eq('test_id', testId)
        .order('question_order');

      if (questionsError) throw questionsError;

      setTest(testData);
      setQuestions(questionsData || []);
      
      if (testData.time_limit_minutes) {
        setTimeLeft(testData.time_limit_minutes * 60);
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить тест",
        variant: "destructive",
      });
      navigate('/student/tests');
    } finally {
      setLoading(false);
    }
  };

  const startTest = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session!.user.id)
        .single();

      if (!profile) throw new Error('Профиль не найден');

      const { data: attempt, error } = await supabase
        .from('test_attempts')
        .insert([{
          test_id: testId,
          student_id: profile.id,
          started_at: new Date().toISOString(),
          is_completed: false,
          quarter: test?.quarter || '',
          academic_year: test?.academic_year || ''
        }])
        .select()
        .single();

      if (error) throw error;

      setAttemptId(attempt.id);
      setTestStarted(true);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось начать тест",
        variant: "destructive",
      });
    }
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers({
      ...answers,
      [questionId]: optionId
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitTest = async () => {
    if (!attemptId) return;

    setSubmitting(true);
    
    try {
      let totalScore = 0;
      let maxScore = 0;

      // Submit answers and calculate score
      for (const question of questions) {
        const selectedOptionId = answers[question.id];
        maxScore += question.points;

        if (selectedOptionId) {
          const selectedOption = question.question_options.find(opt => opt.id === selectedOptionId);
          const isCorrect = selectedOption?.is_correct || false;
          const pointsEarned = isCorrect ? question.points : 0;
          
          totalScore += pointsEarned;

          await supabase
            .from('student_answers')
            .insert([{
              attempt_id: attemptId,
              question_id: question.id,
              selected_option_id: selectedOptionId,
              is_correct: isCorrect,
              points_earned: pointsEarned
            }]);
        } else {
          // No answer selected
          await supabase
            .from('student_answers')
            .insert([{
              attempt_id: attemptId,
              question_id: question.id,
              selected_option_id: null,
              is_correct: false,
              points_earned: 0
            }]);
        }
      }

      const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      // Update test attempt
      await supabase
        .from('test_attempts')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          total_score: totalScore,
          max_score: maxScore,
          percentage_score: percentageScore
        })
        .eq('id', attemptId);

      toast({
        title: "Тест завершен",
        description: "Ваши ответы сохранены",
      });

      navigate('/student/tests');
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить ответы",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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

  if (!test) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Тест не найден</h3>
              <p className="text-muted-foreground">Запрашиваемый тест не существует или был удален</p>
              <Button onClick={() => navigate('/student/tests')} className="mt-4">
                Вернуться к тестам
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-6 w-6 mr-2" />
                {test.title}
              </CardTitle>
              <CardDescription>{test.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{test.total_questions} вопросов</span>
                </div>
                {test.time_limit_minutes && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{test.time_limit_minutes} минут</span>
                  </div>
                )}
              </div>

              {test.quarter && (
                <div>
                  <Badge variant="secondary">{test.quarter} четверть</Badge>
                </div>
              )}

              <div className="p-4 bg-primary/5 rounded-lg">
                <h4 className="font-semibold mb-2">Инструкции:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Внимательно прочитайте каждый вопрос</li>
                  <li>• Выберите один правильный ответ для каждого вопроса</li>
                  <li>• Вы можете переходить между вопросами</li>
                  {test.time_limit_minutes && (
                    <li>• При истечении времени тест завершится автоматически</li>
                  )}
                  <li>• После завершения теста результаты будут недоступны для просмотра</li>
                </ul>
              </div>

              <div className="flex justify-center">
                <Button onClick={startTest} size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Начать тест
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredQuestions = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">{test.title}</h1>
              <Badge variant="outline">
                Вопрос {currentQuestionIndex + 1} из {questions.length}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Отвечено: {answeredQuestions}/{questions.length}
              </div>
              {timeLeft !== null && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span className={`font-mono ${timeLeft < 300 ? 'text-destructive' : ''}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {currentQuestion && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg leading-relaxed">
                {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {currentQuestion.question_options
                  .sort((a, b) => a.option_order - b.option_order)
                  .map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                      className={`w-full p-4 text-left rounded-lg border transition-colors ${
                        answers[currentQuestion.id] === option.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          answers[currentQuestion.id] === option.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {answers[currentQuestion.id] === option.id && (
                            <CheckCircle className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        <span>{option.option_text}</span>
                      </div>
                    </button>
                  ))}
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  Предыдущий
                </Button>
                
                <div className="flex space-x-3">
                  {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                      onClick={handleSubmitTest}
                      disabled={submitting}
                      className="min-w-[120px]"
                    >
                      {submitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      ) : null}
                      Завершить тест
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextQuestion}
                      disabled={currentQuestionIndex === questions.length - 1}
                    >
                      Следующий
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}