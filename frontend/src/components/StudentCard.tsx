import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Calendar, 
  MapPin, 
  Mail, 
  Phone,
  Clock,
  CheckCircle,
  XCircle 
} from "lucide-react";

interface StudentCardProps {
  student: {
    id: string;
    name: string;
    rollNumber: string;
    email: string;
    phone: string;
    course: string;
    year: string;
    department: string;
    avatar?: string;
    attendanceRate: number;
    totalClasses: number;
    attendedClasses: number;
    lastAttendance: string;
    status: "present" | "absent" | "late";
  };
  onEdit?: () => void;
  onViewDetails?: () => void;
}

const StudentCard = ({ student, onEdit, onViewDetails }: StudentCardProps) => {
  const getStatusColor = () => {
    switch (student.status) {
      case "present":
        return "bg-success text-success-foreground";
      case "late":
        return "bg-warning text-warning-foreground";
      case "absent":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = () => {
    switch (student.status) {
      case "present":
        return <CheckCircle className="w-4 h-4" />;
      case "absent":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Card className="glass-card hover-glow transition-smooth group">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            {student.avatar ? (
              <img 
                src={student.avatar} 
                alt={student.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              student.name.split(' ').map(n => n[0]).join('').slice(0, 2)
            )}
          </div>

          {/* Student Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-foreground truncate">
                {student.name}
              </h3>
              <Badge className={getStatusColor()}>
                {getStatusIcon()}
                {student.status}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Roll: {student.rollNumber}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>{student.course} - {student.year} Year</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span className="truncate">{student.email}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>{student.phone}</span>
              </div>
            </div>

            {/* Attendance Stats */}
            <div className="mt-4 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Attendance Rate</span>
                <span className="text-sm font-bold text-primary">
                  {student.attendanceRate}%
                </span>
              </div>
              
              <div className="w-full bg-border rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-smooth"
                  style={{ width: `${student.attendanceRate}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{student.attendedClasses}/{student.totalClasses} classes</span>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Last: {student.lastAttendance}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetails}
                className="flex-1"
              >
                View Details
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={onEdit}
                className="flex-1"
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCard;