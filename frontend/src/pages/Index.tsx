import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Calendar, 
  UserCheck, 
  BarChart3,
  ArrowRight,
  Shield,
  Scan,
  Clock,
  User
} from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

interface Analytics {
  totalStudents: number;
  presentToday: number;
  attendanceRate: string;
  activeClasses: number;
  recognitionAccuracy: string;
}

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<Analytics>({
    totalStudents: 0,
    presentToday: 0,
    attendanceRate: "0%",
    activeClasses: 0,
    recognitionAccuracy: "0%"
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Scan,
      title: "Face Recognition",
      description: "Advanced AI-powered facial recognition for seamless attendance tracking",
      color: "from-primary to-primary-glow"
    },
    {
      icon: Users,
      title: "Student Management",
      description: "Comprehensive student profile management with detailed analytics",
      color: "from-accent to-secondary"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Real-time attendance analytics and reporting for administrators",
      color: "from-success to-primary"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with reliable attendance tracking",
      color: "from-warning to-accent"
    }
  ];

  const stats = [
    { label: "Active Students", value: analytics.totalStudents.toString(), icon: Users },
    { label: "Classes Today", value: analytics.activeClasses.toString(), icon: Calendar },
    { label: "Attendance Rate", value: analytics.attendanceRate, icon: BarChart3 },
    { label: "Recognition Accuracy", value: analytics.recognitionAccuracy, icon: UserCheck }
  ];

  const quickActions = user?.role === 'admin' ? [
    {
      title: "Manage Students",
      description: "Add, edit, and manage student profiles",
      icon: Users,
      href: "/students",
      color: "from-primary to-accent"
    },
    {
      title: "View Analytics",
      description: "Check attendance reports and statistics",
      icon: BarChart3,
      href: "/admin",
      color: "from-success to-primary"
    },
    {
      title: "Face Recognition",
      description: "Test the face recognition system",
      icon: Scan,
      href: "/recognition",
      color: "from-accent to-secondary"
    }
  ] : [
    {
      title: "Mark Attendance",
      description: "Use face recognition to mark your attendance",
      icon: Scan,
      href: "/recognition",
      color: "from-primary to-accent"
    },
    {
      title: "View Profile",
      description: "Check your attendance history and profile",
      icon: User,
      href: "/profile",
      color: "from-success to-primary"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl mb-12">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/40" />
          <div className="relative p-8 sm:p-12 lg:p-16">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                Welcome to St. Francis Xavier
                <span className="block text-primary">Attendance System</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Advanced face recognition technology for seamless student attendance tracking and management.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" variant="gradient" asChild>
                  <Link to="/recognition">
                    Start Recognition
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/profile">
                    View Profile
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <Card key={index} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {isLoading ? "..." : stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Card key={index} className="glass-card hover-glow transition-smooth group">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground mb-2">
                        {action.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {action.description}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={action.href}>
                          Get Started
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features */}
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            System Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
