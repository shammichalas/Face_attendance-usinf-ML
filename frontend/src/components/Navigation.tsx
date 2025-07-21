import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, 
  Users, 
  Calendar, 
  Settings, 
  UserCheck,
  Menu,
  X,
  User,
  LogOut
} from "lucide-react";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Define navigation items based on user role
  const getNavItems = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      return [
        { path: "/", label: "Home", icon: Home },
        { path: "/admin", label: "Admin", icon: Settings },
        { path: "/students", label: "Students", icon: Users },
        { path: "/attendance", label: "Attendance", icon: Calendar },
        { path: "/recognition", label: "Face Recognition", icon: UserCheck },
      ];
    } else {
      return [
        { path: "/", label: "Home", icon: Home },
        { path: "/recognition", label: "Face Recognition", icon: UserCheck },
        { path: "/profile", label: "Profile", icon: User },
      ];
    }
  };

  const navItems = getNavItems();

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return null; // Don't show navigation if user is not logged in
  }

  return (
    <nav className="glass-card border-b border-border/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                FaceAttend
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? "gradient" : "ghost"}
                    size="sm"
                    className="transition-smooth"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            
            {/* User Menu */}
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Welcome, {user.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border/50">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive(item.path) ? "gradient" : "ghost"}
                      className="w-full justify-start transition-smooth"
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              
              {/* Mobile User Menu */}
              <div className="pt-4 border-t border-border mt-4">
                <div className="px-2 pb-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    Signed in as {user.name}
                  </p>
                  <Button
                    variant="ghost"
                    onClick={logout}
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;