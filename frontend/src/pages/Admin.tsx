import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import StudentCard from "@/components/StudentCard";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  Calendar,
  BarChart3,
  UserCheck
} from "lucide-react";

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

interface Analytics {
  totalStudents: number;
  presentToday: number;
  attendanceRate: string;
  activeClasses: number;
  recognitionAccuracy: string;
}

const Admin = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalStudents: 0,
    presentToday: 0,
    attendanceRate: "0%",
    activeClasses: 0,
    recognitionAccuracy: "0%"
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Schedule state
  const [periods, setPeriods] = useState([{ subject: '', start: '', end: '' }]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [attendanceByStudent, setAttendanceByStudent] = useState<Record<string, any[]>>({});
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch students
      const studentsResponse = await fetch('http://localhost:5000/api/students', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStudents(studentsData);
      }

      // Fetch analytics
      const analyticsResponse = await fetch('http://localhost:5000/api/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch today's schedule
  const fetchSchedule = async () => {
    setScheduleLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/schedule?date=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTodaySchedule(data.periods || []);
    } catch (e) {
      setTodaySchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  };
  useEffect(() => { fetchSchedule(); }, []);

  // Fetch today's attendance for all students (admin)
  const fetchAttendanceByStudent = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/attendance?date=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAttendanceByStudent(data.attendance || {});
    } catch (e) {
      setAttendanceByStudent({});
    }
  };
  useEffect(() => { fetchAttendanceByStudent(); }, []);

  // Add/remove period rows
  const addPeriod = () => setPeriods([...periods, { subject: '', start: '', end: '' }]);
  const removePeriod = (idx: number) => setPeriods(periods.filter((_, i) => i !== idx));
  const updatePeriod = (idx: number, field: string, value: string) => {
    setPeriods(periods.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  // Submit schedule
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (periods.some(p => !p.subject || !p.start || !p.end)) {
      toast({ title: 'All fields required for each period', variant: 'destructive' });
      return;
    }
    setScheduleLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/schedule', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: today, periods: periods.map((p, i) => ({ period: i+1, ...p })) })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Schedule set!', description: 'Today\'s schedule has been updated.' });
        setPeriods([{ subject: '', start: '', end: '' }]);
        fetchSchedule();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to set schedule', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to set schedule', variant: 'destructive' });
    } finally {
      setScheduleLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "Total Students", value: analytics.totalStudents.toString(), icon: Users, color: "from-primary to-accent" },
    { label: "Present Today", value: analytics.presentToday.toString(), icon: UserCheck, color: "from-success to-primary" },
    { label: "Average Attendance", value: analytics.attendanceRate, icon: BarChart3, color: "from-accent to-secondary" },
    { label: "Active Classes", value: analytics.activeClasses.toString(), icon: Calendar, color: "from-warning to-accent" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage students and monitor attendance system
            </p>
          </div>
          
          <Button 
            variant="gradient" 
            size="lg"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Student
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Controls */}
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

        {/* Loading State */}
        {isLoading && (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard data...</p>
            </CardContent>
          </Card>
        )}

        {/* Schedule Section */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Set Today's Class Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              {periods.map((p, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Subject</Label>
                    <Input value={p.subject} onChange={e => updatePeriod(idx, 'subject', e.target.value)} placeholder={`Period ${idx+1} Subject`} />
                  </div>
                  <div>
                    <Label>Start</Label>
                    <Input type="time" value={p.start} onChange={e => updatePeriod(idx, 'start', e.target.value)} />
                  </div>
                  <div>
                    <Label>End</Label>
                    <Input type="time" value={p.end} onChange={e => updatePeriod(idx, 'end', e.target.value)} />
                  </div>
                  <Button type="button" variant="outline" onClick={() => removePeriod(idx)} disabled={periods.length === 1}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addPeriod}>Add Period</Button>
              <Button type="submit" disabled={scheduleLoading} variant="gradient">
                {scheduleLoading ? 'Saving...' : 'Set Schedule'}
              </Button>
            </form>
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Today's Schedule</h3>
              {scheduleLoading ? <p>Loading...</p> : (
                todaySchedule.length === 0 ? <p>No schedule set for today.</p> :
                <ul className="space-y-2">
                  {todaySchedule.map((p, idx) => (
                    <li key={idx} className="p-2 rounded bg-muted flex gap-4 items-center">
                      <span className="font-bold">Period {p.period}:</span>
                      <span>{p.subject}</span>
                      <span>{p.start} - {p.end}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((student) => {
              const attendance = attendanceByStudent[student.id] || [];
              const periodsAttended = attendance.map(a => a.period);
              return (
                <div key={student.id} className="relative">
                  <StudentCard
                    student={{
                      ...student,
                      phone: student.phone || 'N/A',
                      year: student.year || '1st',
                      department: student.department || 'Computer Science',
                      avatar: student.avatar,
                      attendanceRate: student.attendanceRate || 0,
                      totalClasses: student.totalClasses || 0,
                      attendedClasses: student.attendedClasses || 0,
                      lastAttendance: student.lastAttendance || 'Never',
                      status: student.status || 'absent'
                    }}
                    onEdit={() => console.log('Edit student:', student.id)}
                    onViewDetails={() => console.log('View details:', student.id)}
                  />
                  {/* Period attendance summary table */}
                  {todaySchedule.length > 0 && (
                    <div className="mt-2">
                      <table className="text-xs w-full border rounded">
                        <thead>
                          <tr>
                            <th className="px-2 py-1">Period</th>
                            <th className="px-2 py-1">Subject</th>
                            <th className="px-2 py-1">Status</th>
                            <th className="px-2 py-1">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todaySchedule.map((p) => {
                            const rec = attendance.find(a => a.period === p.period);
                            return (
                              <tr key={p.period} className="border-t">
                                <td className="px-2 py-1">{p.period}</td>
                                <td className="px-2 py-1">{p.subject}</td>
                                <td className="px-2 py-1">
                                  {rec ? (
                                    <span className="text-success">Present</span>
                                  ) : (
                                    <span className="text-destructive">Absent</span>
                                  )}
                                </td>
                                <td className="px-2 py-1">{rec ? rec.time : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
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
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Student
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        {!isLoading && filteredStudents.length > 0 && (
          <div className="mt-8 text-center text-muted-foreground">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;