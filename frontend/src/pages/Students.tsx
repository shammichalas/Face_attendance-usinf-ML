import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import StudentCard from "@/components/StudentCard";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users } from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  course: string;
  role: string;
  phone?: string;
  year?: string;
  department?: string;
  avatar?: string;
  attendanceRate?: number;
  totalClasses?: number;
  attendedClasses?: number;
  lastAttendance?: string;
  status?: "present" | "absent" | "late";
}

const Students = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [attendanceByStudent, setAttendanceByStudent] = useState<Record<string, any[]>>({});
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const [studentsRes, scheduleRes, attendanceRes] = await Promise.all([
        fetch('http://localhost:5000/api/students', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`http://localhost:5000/api/schedule?date=${today}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`http://localhost:5000/api/attendance?date=${today}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      let students: Student[] = [];
      let schedule: any[] = [];
      let attendance: Record<string, any[]> = {};

      if (studentsRes.ok) {
        students = await studentsRes.json();
      }
      if (scheduleRes.ok) {
        const scheduleJson = await scheduleRes.json();
        schedule = Array.isArray(scheduleJson.periods) ? scheduleJson.periods : [];
      }
      if (attendanceRes.ok) {
        const attendanceJson = await attendanceRes.json();
        attendance = attendanceJson && typeof attendanceJson.attendance === "object" ? attendanceJson.attendance : {};
      }

      setStudents(students);
      setTodaySchedule(schedule);
      setAttendanceByStudent(attendance);
      setIsLoading(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load students or attendance.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Students</h1>
            <p className="text-xl text-muted-foreground">Manage students</p>
          </div>
          <Button variant="gradient" size="lg" onClick={() => setShowAddForm(true)}>
            <Plus className="w-5 h-5 mr-2" /> Add Student
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search students by name, roll number, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {isLoading && (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading students...</p>
            </CardContent>
          </Card>
        )}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((student) => {
              const attendance = attendanceByStudent[student.id] || [];
              const attended = attendance.filter(a => a.status === 'present').length;
              const total = todaySchedule.length;
              const percent = total > 0 ? Math.round((attended / total) * 100) : 0;
              const last = attendance.length > 0 ? attendance[attendance.length - 1].time : 'Never';
              return (
                <StudentCard
                  key={student.id}
                  student={{
                    ...student,
                    phone: student.phone || 'N/A',
                    year: student.year || '1st',
                    department: student.department || 'Computer Science',
                    avatar: student.avatar,
                    attendanceRate: percent,
                    totalClasses: total,
                    attendedClasses: attended,
                    lastAttendance: last,
                    status: attended > 0 ? 'present' : 'absent'
                  }}
                  onEdit={() => console.log('Edit student:', student.id)}
                  onViewDetails={() => console.log('View details:', student.id)}
                />
              );
            })}
          </div>
        )}
        {!isLoading && filteredStudents.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No students found</h3>
              <p className="text-muted-foreground">
                {students.length === 0 
                  ? "No students have been added yet. Add your first student to get started."
                  : "Try adjusting your search terms to find students."
                }
              </p>
              {students.length === 0 && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add First Student
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {!isLoading && filteredStudents.length > 0 && (
          <div className="mt-8 text-center text-muted-foreground">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        )}
      </div>
    </div>
  );
};

export default Students;