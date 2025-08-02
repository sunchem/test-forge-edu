import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  Users, 
  BarChart3, 
  Shield, 
  Clock, 
  CheckCircle,
  BookOpen,
  Award,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Hero = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <GraduationCap className="h-8 w-8 text-primary" />,
      title: "Создание тестов",
      description: "Легко создавайте тесты с различными типами вопросов"
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Управление классами",
      description: "Организуйте учеников по классам и школам"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "Детальная аналитика",
      description: "Просматривайте результаты по четвертям и годам"
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Безопасность",
      description: "Контроль доступа и защита от повторного прохождения"
    },
    {
      icon: <Clock className="h-8 w-8 text-primary" />,
      title: "Ограничение времени",
      description: "Устанавливайте временные рамки для тестов"
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
      title: "Автоматическая проверка",
      description: "Мгновенные результаты в процентах"
    }
  ];

  const stats = [
    { icon: <BookOpen className="h-6 w-6" />, value: "1000+", label: "Тестов создано" },
    { icon: <Users className="h-6 w-6" />, value: "50+", label: "Школ" },
    { icon: <Award className="h-6 w-6" />, value: "5000+", label: "Учеников" },
    { icon: <TrendingUp className="h-6 w-6" />, value: "95%", label: "Точность" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/10 to-secondary-light/10">
      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Современная платформа для{' '}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                онлайн тестирования
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              BlockT.uz - это интуитивная система для создания тестов, управления классами 
              и отслеживания успеваемости учеников в режиме реального времени.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-4"
              >
                Начать бесплатно
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/demo')}
                className="text-lg px-8 py-4"
              >
                Посмотреть демо
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-card transition-all duration-300">
                <CardContent className="flex flex-col items-center p-6">
                  <div className="text-primary mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground text-center">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Все необходимые инструменты
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Полный набор функций для эффективного проведения онлайн тестирования
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-card shadow-card hover:shadow-elevation transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-primary py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Готовы начать?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к сотням школ, которые уже используют BlockT.uz для 
            современного образования
          </p>
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => navigate('/auth')}
            className="text-lg px-8 py-4"
          >
            Создать аккаунт
          </Button>
        </div>
      </section>
    </div>
  );
};