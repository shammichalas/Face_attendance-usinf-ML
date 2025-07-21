import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";

const Attendance = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [attendanceByStudent, setAttendanceByStudent] = useState<Record<string, any[]>>({});
  const today = new Date().toISOString().slice(0, 10);

  // Fetch all data
  const fetchAll = async () => {
    const token = localStorage.getItem('token');
    const [studentsRes, scheduleRes, attendanceRes] = await Promise.all([
      fetch('http://localhost:5000/api/students', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`http://localhost:5000/api/schedule?date=${today}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`http://localhost:5000/api/attendance?date=${today}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    const students = studentsRes.ok ? await studentsRes.json() : [];
    const schedule = scheduleRes.ok ? (await scheduleRes.json()).periods || [] : [];
    const attendance = attendanceRes.ok ? (await attendanceRes.json()).attendance || {};
    setStudents(students);
    setTodaySchedule(schedule);
    setAttendanceByStudent(attendance);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaySchedule.length === 0 ? (
              <p className="text-muted-foreground">No schedule set for today.</p>
            ) : (
              <table className="w-full text-xs border rounded">
                <thead>
                  <tr>
                    <th className="px-2 py-1">Student</th>
                    {todaySchedule.map((p: any) => (
                      <th key={p.period} className="px-2 py-1">P{p.period}<br/>{p.subject}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const attendance = attendanceByStudent[student.id] || [];
                    return (
                      <tr key={student.id} className="border-t">
                        <td className="px-2 py-1 font-semibold">{student.name}</td>
                        {todaySchedule.map((p: any) => {
                          const rec = attendance.find((a: any) => a.period === p.period);
                          return (
                            <td key={p.period} className="px-2 py-1 text-center">
                              {rec ? (
                                <span className="text-success">✔<br/>{rec.time}</span>
                              ) : (
                                <span className="text-destructive">✗</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Attendance; 