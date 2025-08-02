import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Download, Users, BookOpen, TrendingUp, School } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StudentResult {
  student_id: string;
  student_name: string;
  class_name?: string;
  subjects: { [key: string]: number }; // Subject -> average percentage
  overall_average: number;
}

interface ClassStats {
  class_name: string;
  average_score: number;
  total_students: number;
  subjects: { [key: string]: number };
}

interface SchoolStats {
  total_students: number;
  total_teachers: number;
  total_tests: number;
  average_score: number;
}

export default function AdminStats() {
  const [loading, setLoading] = useState(true);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [schoolStats, setSchoolStats] = useState<SchoolStats | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [schoolId, setSchoolId] = useState<string>('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, school_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile || (!['admin', 'school_admin'].includes(profile.role))) {
        navigate('/dashboard');
        return;
      }

      setUserRole(profile.role);
      setSchoolId(profile.school_id || '');
      loadStatistics(profile.role, profile.school_id);
    } catch (error: any) {
      toast({
        title: "Ошибка доступа",
        description: "Не удалось проверить права доступа",
        variant: "destructive",
      });
    }
  };

  const loadStatistics = async (role: string, schoolId?: string) => {
    try {
      await Promise.all([
        loadStudentResults(role, schoolId),
        loadSchoolStats(role, schoolId)
      ]);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить статистику",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentResults = async (role: string, schoolId?: string) => {
    try {
      // Build query based on role
      let query = supabase
        .from('test_attempts')
        .select(`
          student_id,
          total_score,
          max_score,
          percentage_score,
          test_id,
          tests!inner(
            title,
            school_id
          ),
          profiles!student_id(
            first_name,
            last_name,
            class_name
          )
        `)
        .eq('is_completed', true);

      if (role === 'school_admin' && schoolId) {
        query = query.eq('tests.school_id', schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process results by student and subject
      const studentMap = new Map<string, StudentResult>();

      data?.forEach((attempt) => {
        const studentId = attempt.student_id;
        const subject = attempt.tests?.title || 'Общий'; // Use title as subject for now
        const percentage = attempt.percentage_score || 0;
        const studentName = `${attempt.profiles?.first_name} ${attempt.profiles?.last_name}`;
        const className = attempt.profiles?.class_name;

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student_id: studentId,
            student_name: studentName,
            class_name: className,
            subjects: {},
            overall_average: 0
          });
        }

        const student = studentMap.get(studentId)!;
        
        // Calculate average for this subject
        if (student.subjects[subject]) {
          student.subjects[subject] = (student.subjects[subject] + percentage) / 2;
        } else {
          student.subjects[subject] = percentage;
        }
      });

      // Calculate overall averages and class stats
      const results = Array.from(studentMap.values()).map(student => {
        const subjectScores = Object.values(student.subjects);
        const overall = subjectScores.length > 0 
          ? subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length 
          : 0;
        
        return {
          ...student,
          overall_average: Math.round(overall * 100) / 100
        };
      });

      setStudentResults(results);
      calculateClassStats(results);
    } catch (error) {
      console.error('Error loading student results:', error);
    }
  };

  const calculateClassStats = (results: StudentResult[]) => {
    const classMap = new Map<string, { scores: number[]; students: Set<string>; subjects: { [key: string]: number[] } }>();

    results.forEach(student => {
      const className = student.class_name || 'Без класса';
      
      if (!classMap.has(className)) {
        classMap.set(className, { 
          scores: [], 
          students: new Set(), 
          subjects: {} 
        });
      }

      const classData = classMap.get(className)!;
      classData.students.add(student.student_id);
      classData.scores.push(student.overall_average);

      // Add subject scores
      Object.entries(student.subjects).forEach(([subject, score]) => {
        if (!classData.subjects[subject]) {
          classData.subjects[subject] = [];
        }
        classData.subjects[subject].push(score);
      });
    });

    const stats = Array.from(classMap.entries()).map(([className, data]) => ({
      class_name: className,
      total_students: data.students.size,
      average_score: data.scores.length > 0 
        ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100
        : 0,
      subjects: Object.fromEntries(
        Object.entries(data.subjects).map(([subject, scores]) => [
          subject,
          scores.length > 0 
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
            : 0
        ])
      )
    }));

    setClassStats(stats);
  };

  const loadSchoolStats = async (role: string, schoolId?: string) => {
    try {
      let studentsQuery = supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student');
      let teachersQuery = supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'teacher');
      let testsQuery = supabase.from('tests').select('id', { count: 'exact' });

      if (role === 'school_admin' && schoolId) {
        studentsQuery = studentsQuery.eq('school_id', schoolId);
        teachersQuery = teachersQuery.eq('school_id', schoolId);
        testsQuery = testsQuery.eq('school_id', schoolId);
      }

      const [studentsRes, teachersRes, testsRes] = await Promise.all([
        studentsQuery,
        teachersQuery,
        testsQuery
      ]);

      const totalStudents = studentsRes.count || 0;
      const totalTeachers = teachersRes.count || 0;
      const totalTests = testsRes.count || 0;
      
      // Calculate average from student results
      const overallAverage = studentResults.length > 0
        ? studentResults.reduce((sum, student) => sum + student.overall_average, 0) / studentResults.length
        : 0;

      setSchoolStats({
        total_students: totalStudents,
        total_teachers: totalTeachers,
        total_tests: totalTests,
        average_score: Math.round(overallAverage * 100) / 100
      });
    } catch (error) {
      console.error('Error loading school stats:', error);
    }
  };

  const exportToExcel = () => {
    try {
      // Prepare data for Excel export
      const worksheetData = studentResults.map(student => {
        const row: any = {
          'Студент': student.student_name,
          'Класс': student.class_name || 'Не указан'
        };

        // Add all subjects as columns
        const allSubjects = new Set<string>();
        studentResults.forEach(s => {
          Object.keys(s.subjects).forEach(subject => allSubjects.add(subject));
        });

        allSubjects.forEach(subject => {
          row[subject] = student.subjects[subject] ? `${student.subjects[subject].toFixed(1)}%` : 'Нет данных';
        });

        row['Общий средний балл'] = `${student.overall_average.toFixed(1)}%`;
        return row;
      });

      // Add class averages at the bottom
      worksheetData.push({}); // Empty row
      worksheetData.push({ 'Студент': 'СРЕДНИЕ БАЛЛЫ ПО КЛАССАМ' });
      
      classStats.forEach(classData => {
        const row: any = {
          'Студент': `Класс ${classData.class_name}`,
          'Общий средний балл': `${classData.average_score.toFixed(1)}%`
        };
        
        Object.entries(classData.subjects).forEach(([subject, score]) => {
          row[subject] = `${score.toFixed(1)}%`;
        });
        
        worksheetData.push(row);
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Статистика');

      const fileName = `statistics_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Успешно",
        description: "Статистика экспортирована в Excel",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать данные",
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
            <h1 className="text-3xl font-bold text-foreground">
              {userRole === 'admin' ? 'Общая статистика' : 'Статистика школы'}
            </h1>
            <p className="text-muted-foreground">Детальная аналитика успеваемости</p>
          </div>
          
          {studentResults.length > 0 && (
            <Button onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Экспорт в Excel
            </Button>
          )}
        </div>

        {/* Overview Stats */}
        {schoolStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="flex items-center p-6">
                <Users className="h-8 w-8 text-primary mr-4" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{schoolStats.total_students}</p>
                  <p className="text-sm text-muted-foreground">Учеников</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <Users className="h-8 w-8 text-primary mr-4" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{schoolStats.total_teachers}</p>
                  <p className="text-sm text-muted-foreground">Учителей</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <BookOpen className="h-8 w-8 text-primary mr-4" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{schoolStats.total_tests}</p>
                  <p className="text-sm text-muted-foreground">Тестов</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <TrendingUp className="h-8 w-8 text-primary mr-4" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{schoolStats.average_score.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Средний балл</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Student Results Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Результаты по студентам</CardTitle>
            <CardDescription>
              Детальная статистика успеваемости каждого ученика по предметам
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Нет данных</h3>
                <p className="text-muted-foreground text-center">
                  Результаты тестов пока отсутствуют
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Студент</TableHead>
                      <TableHead>Класс</TableHead>
                      {/* Dynamic subject columns */}
                      {Array.from(new Set(studentResults.flatMap(s => Object.keys(s.subjects)))).map(subject => (
                        <TableHead key={subject}>{subject}</TableHead>
                      ))}
                      <TableHead>Общий средний</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentResults.map((student, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{student.student_name}</TableCell>
                        <TableCell>{student.class_name || 'Не указан'}</TableCell>
                        {Array.from(new Set(studentResults.flatMap(s => Object.keys(s.subjects)))).map(subject => (
                          <TableCell key={subject}>
                            {student.subjects[subject] ? (
                              <Badge variant={student.subjects[subject] >= 70 ? "default" : student.subjects[subject] >= 50 ? "secondary" : "destructive"}>
                                {student.subjects[subject].toFixed(1)}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          <Badge variant={student.overall_average >= 70 ? "default" : student.overall_average >= 50 ? "secondary" : "destructive"}>
                            {student.overall_average.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Class Averages */}
        {classStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Средние баллы по классам</CardTitle>
              <CardDescription>
                Сравнение успеваемости между классами
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classStats.map((classData, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Класс {classData.class_name}</h4>
                      <Badge variant={classData.average_score >= 70 ? "default" : classData.average_score >= 50 ? "secondary" : "destructive"}>
                        {classData.average_score.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {classData.total_students} учеников
                    </p>
                    <div className="space-y-1">
                      {Object.entries(classData.subjects).map(([subject, score]) => (
                        <div key={subject} className="flex justify-between text-sm">
                          <span>{subject}:</span>
                          <span className="font-medium">{score.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}