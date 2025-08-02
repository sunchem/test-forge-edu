import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Schools from "./pages/admin/Schools";
import Users from "./pages/admin/Users";
import AdminStats from "./pages/admin/Stats";
import CreateTest from "./pages/teacher/CreateTest";
import TeacherTests from "./pages/teacher/Tests";
import TeacherClasses from "./pages/teacher/Classes";
import TeacherResults from "./pages/teacher/Results";
import StudentTests from "./pages/student/Tests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/schools" element={<Schools />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/stats" element={<AdminStats />} />
          <Route path="/teacher/create-test" element={<CreateTest />} />
          <Route path="/teacher/tests" element={<TeacherTests />} />
          <Route path="/teacher/classes" element={<TeacherClasses />} />
          <Route path="/teacher/results" element={<TeacherResults />} />
          <Route path="/student/tests" element={<StudentTests />} />
          <Route path="/student/results" element={<StudentTests />} />
          <Route path="/student/history" element={<StudentTests />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
