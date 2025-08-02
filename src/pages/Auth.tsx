import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'register';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Ошибка входа",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Добро пожаловать!",
            description: "Вы успешно вошли в систему",
          });
          navigate('/dashboard');
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: firstName,
              last_name: lastName,
              role: role,
            }
          }
        });

        if (error) {
          toast({
            title: "Ошибка регистрации",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Регистрация успешна!",
            description: "Проверьте почту для подтверждения аккаунта",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Произошла ошибка",
        description: "Попробуйте еще раз",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/10 to-secondary-light/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevation">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-xl">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === 'login' ? 'Вход в BlockT.uz' : 'Регистрация в BlockT.uz'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Войдите в свой аккаунт для продолжения' 
              : 'Создайте аккаунт для начала работы'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ваше имя"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ваша фамилия"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Роль</Label>
                  <Select value={role} onValueChange={(value: any) => setRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите роль" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Администратор</SelectItem>
                      <SelectItem value="teacher">Учитель</SelectItem>
                      <SelectItem value="student">Ученик</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ваш@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              variant="hero"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Загрузка...
                </div>
              ) : (
                mode === 'login' ? 'Войти' : 'Зарегистрироваться'
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-sm"
              >
                {mode === 'login' 
                  ? 'Нет аккаунта? Зарегистрируйтесь' 
                  : 'Уже есть аккаунт? Войдите'
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}