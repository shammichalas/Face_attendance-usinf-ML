import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Mail, 
  Hash, 
  BookOpen, 
  Calendar,
  Clock,
  BarChart3,
  Camera,
  Save,
  Edit3,
  Scan
} from "lucide-react";

const StudentProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    rollNumber: user?.rollNumber || "",
    course: user?.course || "",
    department: ""
  });

  // New state for upload form
  const [uploadName, setUploadName] = useState("");
  const [uploadRoll, setUploadRoll] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Schedule and period attendance state
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [periodLoading, setPeriodLoading] = useState<number | null>(null);
  const [activePeriod, setActivePeriod] = useState<number | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [attendancePercent, setAttendancePercent] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mock attendance data
  const attendanceData = {
    totalClasses: 156,
    attendedClasses: 142,
    attendanceRate: 91.0,
    presentDays: 32,
    absentDays: 3,
    lateDays: 1,
    recentActivity: [
      { date: "2024-01-15", status: "present", time: "09:15 AM" },
      { date: "2024-01-14", status: "present", time: "09:12 AM" },
      { date: "2024-01-13", status: "late", time: "09:25 AM" },
      { date: "2024-01-12", status: "present", time: "09:10 AM" },
      { date: "2024-01-11", status: "absent", time: "-" }
    ]
  };

  // Fetch today's schedule and attendance
  const fetchScheduleAndAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const schedRes = await fetch(`http://localhost:5000/api/schedule?date=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const schedData = await schedRes.json();
      setTodaySchedule(schedData.periods || []);
      const attRes = await fetch('http://localhost:5000/api/attendance/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const attData = await attRes.json();
      setTodayAttendance(attData.attendance || []);
    } catch (e) {
      setTodaySchedule([]);
      setTodayAttendance([]);
    }
  };

  // Fetch all attendance for this user
  const fetchRecentAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/attendance/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRecentAttendance(data.attendance || []);
      // Calculate attendance percentage for today
      if (todaySchedule.length > 0) {
        const attended = (data.attendance || []).filter(a => a.status === 'present').length;
        setAttendancePercent(Math.round((attended / todaySchedule.length) * 100));
      } else {
        setAttendancePercent(0);
      }
    } catch (e) {
      setRecentAttendance([]);
      setAttendancePercent(0);
    }
  };

  useEffect(() => { fetchScheduleAndAttendance(); }, []);
  useEffect(() => { fetchRecentAttendance(); }, [todaySchedule]);

  const handleSave = () => {
    // Mock save functionality
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully.",
    });
    setIsEditing(false);
  };

  const captureImage = async (): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return null;
    
    // Wait for video to be ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  };

  const registerFace = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Wait for video to load
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            setTimeout(resolve, 1000);
          };
        }
      });
      
      // Capture image after 2 seconds
      setTimeout(async () => {
        try {
          const imageBlob = await captureImage();
          if (imageBlob) {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('image', imageBlob, 'face.jpg');

            const response = await fetch('http://localhost:5000/api/register-face-quality', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            });

            if (response.ok) {
              toast({
                title: "Face Registered!",
                description: "Your face has been successfully registered for recognition.",
              });
            } else {
              throw new Error('Failed to register face');
            }
          } else {
            throw new Error('Failed to capture image');
          }
        } catch (error) {
          console.error('Face registration error:', error);
          toast({
            title: "Registration Failed",
            description: "Could not register your face. Please try again.",
            variant: "destructive"
          });
        } finally {
          setIsRegisteringFace(false);
          
          // Stop camera
          if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
          }
        }
      }, 2000);
      
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive"
      });
      setIsRegisteringFace(false);
    }
  };

  // New handler for upload registration
  const handleUploadRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName) {
      toast({ title: "Missing fields", description: "Please provide a name and photo.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', uploadFile);
      formData.append('name', uploadName);
      formData.append('rollNumber', uploadRoll);
      const response = await fetch('http://localhost:5000/api/register-face-quality', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Face Registered!", description: data.message || "Photo registered successfully." });
        setUploadFile(null);
        setUploadName("");
        setUploadRoll("");
      } else {
        toast({ title: "Registration Failed", description: data.error || "Could not register face.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Upload Error", description: "Could not upload photo.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // Mark attendance for a period (webcam)
  const markPeriodAttendance = async (period: number) => {
    setActivePeriod(period);
    setPeriodLoading(period);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => setTimeout(resolve, 1000);
        }
      });
      setTimeout(async () => {
        try {
          const imageBlob = await captureImage();
          if (imageBlob) {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('image', imageBlob, 'face.jpg');
            formData.append('period', period.toString());
            const response = await fetch('http://localhost:5000/api/attendance/period', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
            });
            const data = await response.json();
            if (response.ok) {
              toast({ title: 'Attendance Marked', description: data.message || `Attendance marked for period ${period}` });
              fetchScheduleAndAttendance();
            } else {
              toast({ title: 'Error', description: data.error || 'Failed to mark attendance', variant: 'destructive' });
            }
          } else {
            toast({ title: 'Error', description: 'Failed to capture image', variant: 'destructive' });
          }
        } catch (error) {
          toast({ title: 'Error', description: 'Could not mark attendance', variant: 'destructive' });
        } finally {
          setPeriodLoading(null);
          setActivePeriod(null);
          if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
          }
        }
      }, 2000);
    } catch (error) {
      toast({ title: 'Camera Error', description: 'Could not access camera.', variant: 'destructive' });
      setPeriodLoading(null);
      setActivePeriod(null);
    }
  };

  // Mark attendance for a period (upload)
  const handleUploadPeriod = async (e: React.FormEvent, period: number) => {
    e.preventDefault();
    if (!uploadFile) {
      toast({ title: 'No file', description: 'Please select a photo.', variant: 'destructive' });
      return;
    }
    setPeriodLoading(period);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', uploadFile);
      formData.append('period', period.toString());
      const response = await fetch('http://localhost:5000/api/attendance/period', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: 'Attendance Marked', description: data.message || `Attendance marked for period ${period}` });
        setUploadFile(null);
        fetchScheduleAndAttendance();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to mark attendance', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Upload Error', description: 'Could not upload photo.', variant: 'destructive' });
    } finally {
      setPeriodLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Student Profile
          </h1>
          <p className="text-xl text-muted-foreground">
            Manage your profile and view attendance information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rollNumber">Roll Number</Label>
                    <Input
                      id="rollNumber"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="course">Course</Label>
                    <Input
                      id="course"
                      value={formData.course}
                      onChange={(e) => setFormData({...formData, course: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                {isEditing && (
                  <div className="flex gap-4 mt-6">
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Face Registration */}
            <Card className="glass-card mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Face Recognition Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Register your face to enable automatic attendance marking through face recognition.
                  </p>
                  
                  {!isRegisteringFace ? (
                    <Button 
                      variant="gradient" 
                      onClick={() => {
                        setIsRegisteringFace(true);
                        registerFace();
                      }}
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      Register Face
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-64 h-64 border-2 border-primary rounded-lg relative">
                            <div className="absolute inset-0 border-2 border-accent rounded-lg animate-pulse" />
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <Scan className="w-8 h-8 text-primary animate-pulse" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Position your face in the frame and stay still...
                      </p>
                    </div>
                  )}
                  
                  {!isRegisteringFace && (
                    <form className="space-y-2" onSubmit={handleUploadRegister}>
                      <Label>Or upload a photo and enter name:</Label>
                      <Input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                      <Input type="text" placeholder="Full Name" value={uploadName} onChange={e => setUploadName(e.target.value)} />
                      <Input type="text" placeholder="Roll Number (optional)" value={uploadRoll} onChange={e => setUploadRoll(e.target.value)} />
                      <Button type="submit" disabled={isUploading} variant="secondary">
                        {isUploading ? "Uploading..." : "Upload & Register"}
                      </Button>
                    </form>
                  )}
                  
                  {/* Hidden canvas for image capture */}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Stats */}
          <div className="space-y-6">
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Today's Class Schedule & Period Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todaySchedule.length === 0 ? (
                  <p className="text-muted-foreground">No schedule set for today.</p>
                ) : (
                  <ul className="space-y-4">
                    {todaySchedule.map((p, idx) => {
                      const attended = todayAttendance.some(a => a.period === p.period);
                      return (
                        <li key={idx} className="p-3 rounded bg-muted flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                          <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                            <span className="font-bold">Period {p.period}:</span>
                            <span>{p.subject}</span>
                            <span>{p.start} - {p.end}</span>
                          </div>
                          {attended ? (
                            <Badge variant="secondary">Attended</Badge>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <Button variant="gradient" size="sm" disabled={periodLoading === p.period} onClick={() => markPeriodAttendance(p.period)}>
                                {periodLoading === p.period ? 'Marking...' : 'Mark Attendance (Webcam)'}
                              </Button>
                              {activePeriod === p.period && (
                                <div className="mt-2 flex flex-col items-center">
                                  <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    width={180}
                                    height={120}
                                    className="rounded border border-primary"
                                  />
                                  <span className="text-xs text-muted-foreground mt-1">Align your face in the frame</span>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Attendance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {attendancePercent}%
                    </div>
                    <div className="text-sm text-muted-foreground">Today's Attendance</div>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-smooth"
                      style={{ width: `${attendancePercent}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAttendance.length === 0 ? (
                    <div className="text-muted-foreground">No attendance records for today.</div>
                  ) : (
                    recentAttendance.slice(-10).reverse().map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${activity.status === 'present' ? 'bg-success' : activity.status === 'late' ? 'bg-warning' : 'bg-destructive'}`} />
                          <span className="text-sm font-medium">{activity.date} (P{activity.period})</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.time}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;