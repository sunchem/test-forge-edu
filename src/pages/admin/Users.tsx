import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Eye, EyeOff, Download, Key } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';

interface School {
  id: string;
  name: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  school_id?: string;
  created_at: string;
}

interface UserCredential {
  id: string;
  user_id: string;
  email: string;
  password_plain: string;
  school_id: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [credentials, setCredentials] = useState<UserCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentialPasswords, setShowCredentialPasswords] = useState<{[key: string]: boolean}>({});
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: '',
    school_id: ''
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
    loadData();
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

    if (!profile || (!['admin', 'school_admin'].includes(profile.role))) {
      navigate('/dashboard');
      return;
    }
  };

  const loadData = async () => {
    try {
      const [usersResponse, schoolsResponse] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('schools').select('id, name').order('name')
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (schoolsResponse.error) throw schoolsResponse.error;

      setUsers(usersResponse.data || []);
      setSchools(schoolsResponse.data || []);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const password = generatePassword();
      
      // Get the current session to get the token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Не удалось получить токен авторизации');
      }

      // Call Edge Function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          school_id: formData.school_id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Пользователь создан",
        description: `Email: ${formData.email}, Пароль: ${password}`,
      });

      setIsDialogOpen(false);
      setFormData({ email: '', first_name: '', last_name: '', role: '', school_id: '' });
      setGeneratedPassword('');
      
      // Reload data after successful creation
      setTimeout(() => {
        loadData();
      }, 1000);
      
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать пользователя",
        variant: "destructive",
      });
    }
  };

  const loadCredentials = async () => {
    setCredentialsLoading(true);
    try {
      // First get credentials, then get profiles separately
      const { data: credentialsData, error: credentialsError } = await supabase
        .from('user_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (credentialsError) throw credentialsError;

      // Get profiles for all users
      const userIds = credentialsData?.map(c => c.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, role')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const credentialsWithProfiles = credentialsData?.map(credential => ({
        ...credential,
        profiles: profilesData?.find(p => p.user_id === credential.user_id)
      })) || [];

      setCredentials(credentialsWithProfiles as UserCredential[]);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить учетные данные",
        variant: "destructive",
      });
    } finally {
      setCredentialsLoading(false);
    }
  };

  const togglePasswordVisibility = (credentialId: string) => {
    setShowCredentialPasswords(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  const exportToExcel = () => {
    if (credentials.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нет учетных данных для экспорта",
        variant: "destructive",
      });
      return;
    }

    const exportData = credentials.map(credential => ({
      'ФИО': `${credential.profiles?.first_name || ''} ${credential.profiles?.last_name || ''}`,
      'Email': credential.email,
      'Пароль': credential.password_plain,
      'Роль': getRoleText(credential.profiles?.role || ''),
      'Дата создания': new Date(credential.created_at).toLocaleDateString('ru-RU')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Учетные данные');
    
    const schoolName = schools.find(s => s.id === credentials[0]?.school_id)?.name || 'Школа';
    XLSX.writeFile(wb, `${schoolName}_Учетные_данные_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '_')}.xlsx`);
    
    toast({
      title: "Экспорт завершен",
      description: "Файл Excel успешно создан",
    });
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'school_admin': return 'Администратор школы';
      case 'teacher': return 'Учитель';
      case 'student': return 'Ученик';
      default: return role;
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
            <h1 className="text-3xl font-bold text-foreground">Управление пользователями</h1>
            <p className="text-muted-foreground">Создание аккаунтов для учителей и учеников</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Создать пользователя
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создать нового пользователя</DialogTitle>
                <DialogDescription>
                  Заполните данные для создания аккаунта
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="first_name">Имя *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Фамилия *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Роль *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите роль" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school_admin">Администратор школы</SelectItem>
                      <SelectItem value="teacher">Учитель</SelectItem>
                      <SelectItem value="student">Ученик</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="school_id">Школа *</Label>
                  <Select value={formData.school_id} onValueChange={(value) => setFormData({ ...formData, school_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите школу" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {generatedPassword && (
                  <div className="p-4 bg-primary-light/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label>Сгенерированный пароль:</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="font-mono text-lg">
                      {showPassword ? generatedPassword : '••••••••'}
                    </div>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit">Создать</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="credentials" onClick={loadCredentials}>
              <Key className="h-4 w-4 mr-2" />
              Логины и пароли
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <Card key={user.id} className="shadow-card hover:shadow-elevation transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Users className="h-6 w-6 text-primary" />
                      <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {getRoleText(user.role)}
                      </span>
                    </div>
                    <CardTitle>{user.first_name} {user.last_name}</CardTitle>
                    <CardDescription>
                      Создан: {new Date(user.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="credentials" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Учетные данные</h2>
                <p className="text-muted-foreground">Логины и пароли пользователей вашей школы</p>
              </div>
              <Button onClick={exportToExcel} disabled={credentials.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Экспорт в Excel
              </Button>
            </div>

            {credentialsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : credentials.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Нет учетных данных</h3>
                  <p className="text-muted-foreground">Создайте пользователей, чтобы увидеть их учетные данные здесь</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Пароль</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>Дата создания</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {credentials.map((credential) => (
                        <TableRow key={credential.id}>
                          <TableCell className="font-medium">
                            {credential.profiles?.first_name} {credential.profiles?.last_name}
                          </TableCell>
                          <TableCell>{credential.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <code className="bg-muted px-2 py-1 rounded text-sm">
                                {showCredentialPasswords[credential.id] 
                                  ? credential.password_plain 
                                  : '••••••••'
                                }
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePasswordVisibility(credential.id)}
                              >
                                {showCredentialPasswords[credential.id] 
                                  ? <EyeOff className="h-4 w-4" /> 
                                  : <Eye className="h-4 w-4" />
                                }
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-full">
                              {getRoleText(credential.profiles?.role || '')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(credential.created_at).toLocaleDateString('ru-RU')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}