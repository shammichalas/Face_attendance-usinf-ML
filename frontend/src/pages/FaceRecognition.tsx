import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Scan, 
  UserCheck, 
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Square,
  RotateCcw
} from "lucide-react";
import studentCardImage from "@/assets/student-card.jpg";

const FaceRecognition = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    name: string;
    rollNumber: string;
    course: string;
    status: "success" | "failed" | "unknown";
    confidence: number;
    timestamp: string;
  } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

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

  const recognizeFace = async (imageBlob: Blob) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', imageBlob, 'face.jpg');

      const response = await fetch('http://localhost:5000/api/recognize-quality', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.status === 'success') {
          return {
            name: data.user.name,
            rollNumber: data.user.rollNumber || 'N/A',
            course: data.user.course || 'N/A',
            status: 'success' as const,
            confidence: data.user.confidence || 99.0,
            timestamp: new Date().toLocaleTimeString()
          };
        } else {
          return {
            name: 'Unknown Person',
            rollNumber: 'N/A',
            course: 'N/A',
            status: 'unknown' as const,
            confidence: 0,
            timestamp: new Date().toLocaleTimeString()
          };
        }
      } else {
        throw new Error(data.error || 'Recognition failed');
      }
    } catch (error) {
      console.error('Recognition error:', error);
      throw error;
    }
  };

  const startScanning = async () => {
    setIsScanning(true);
    setScanResult(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
             // Wait for video to load and be ready
       await new Promise((resolve) => {
         if (videoRef.current) {
           videoRef.current.onloadedmetadata = () => {
             // Wait a bit more for video to be fully ready
             setTimeout(resolve, 1000);
           };
         }
       });
       
       // Capture image after 3 seconds
       setTimeout(async () => {
         try {
           const imageBlob = await captureImage();
           if (imageBlob) {
             const result = await recognizeFace(imageBlob);
             setScanResult(result);
           } else {
             throw new Error('Failed to capture image - video not ready');
           }
         } catch (error) {
           console.error('Recognition error:', error);
           toast({
             title: "Recognition Failed",
             description: error instanceof Error ? error.message : "Could not recognize face. Please try again.",
             variant: "destructive"
           });
           setScanResult({
             name: 'Error',
             rollNumber: 'N/A',
             course: 'N/A',
             status: 'failed' as const,
             confidence: 0,
             timestamp: new Date().toLocaleTimeString()
           });
         } finally {
           setIsScanning(false);
           
           // Stop camera
           if (videoRef.current?.srcObject) {
             const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
             tracks.forEach(track => track.stop());
           }
         }
       }, 3000);
      
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanResult(null);
    
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const resetScan = () => {
    setScanResult(null);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const getStatusIcon = () => {
    switch (scanResult?.status) {
      case "success":
        return <CheckCircle className="w-8 h-8 text-success" />;
      case "failed":
        return <XCircle className="w-8 h-8 text-destructive" />;
      case "unknown":
        return <Clock className="w-8 h-8 text-warning" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (scanResult?.status) {
      case "success":
        return "bg-success text-success-foreground";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      case "unknown":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Face Recognition Attendance
          </h1>
          <p className="text-xl text-muted-foreground">
            Secure and accurate student identification system
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Camera Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Camera Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                  {!isScanning && !videoRef.current?.srcObject ? (
                    <div 
                      className="w-full h-full bg-cover bg-center flex items-center justify-center"
                      style={{ backgroundImage: `url(${studentCardImage})` }}
                    >
                      <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 text-center">
                        <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Click start to begin face recognition</p>
                      </div>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {/* Scanning Overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-64 border-2 border-primary rounded-lg relative">
                        <div className="absolute inset-0 border-2 border-accent rounded-lg animate-pulse" />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <Scan className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Hidden canvas for image capture */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {/* Camera Controls */}
                <div className="flex justify-center gap-4 mt-4">
                  {!isScanning ? (
                    <Button 
                      variant="gradient" 
                      size="lg"
                      onClick={startScanning}
                      className="transition-smooth"
                    >
                      <Play className="w-5 h-5" />
                      Start Scanning
                    </Button>
                  ) : (
                    <Button 
                      variant="destructive" 
                      size="lg"
                      onClick={stopScanning}
                      className="transition-smooth"
                    >
                      <Square className="w-5 h-5" />
                      Stop Scanning
                    </Button>
                  )}
                  
                  {scanResult && (
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={resetScan}
                      className="transition-smooth"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Recognition Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!scanResult ? (
                <div className="text-center py-12">
                  <UserCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Results Yet</h3>
                  <p className="text-muted-foreground">
                    Start scanning to see recognition results
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon()}
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {scanResult.status === 'success' ? 'Recognized' : 
                           scanResult.status === 'unknown' ? 'Unknown Person' : 'Failed'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {scanResult.timestamp}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor()}>
                      {scanResult.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Student Info */}
                  {scanResult.status === 'success' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Name</label>
                          <p className="text-foreground font-semibold">{scanResult.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Roll Number</label>
                          <p className="text-foreground font-semibold">{scanResult.rollNumber}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Course</label>
                          <p className="text-foreground font-semibold">{scanResult.course}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Confidence</label>
                          <p className="text-foreground font-semibold">{scanResult.confidence}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {scanResult.status === 'failed' && (
                    <div className="text-center py-4">
                      <XCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
                      <p className="text-destructive font-medium">Recognition failed</p>
                      <p className="text-sm text-muted-foreground">Please try again</p>
                    </div>
                  )}

                  {/* Unknown Person */}
                  {scanResult.status === 'unknown' && (
                    <div className="text-center py-4">
                      <Clock className="w-12 h-12 text-warning mx-auto mb-2" />
                      <p className="text-warning font-medium">Unknown person detected</p>
                      <p className="text-sm text-muted-foreground">This person is not registered in the system</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;