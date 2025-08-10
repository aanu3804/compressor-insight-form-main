import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="relative min-h-screen">
      {/* Blurred Background Layer */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'url("step1.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          filter: 'blur(2px)'
        }}
      />
      
      {/* Content Layer */}
      <main className="relative z-10 min-h-screen flex items-center justify-center">
        <Helmet>
          <title>Compressor Data Collection | Start</title>
          <meta name="description" content="Clean, modern, mobile-friendly multi-step form to collect compressor details with photos." />
          <link rel="canonical" href={typeof window !== "undefined" ? window.location.href : ""} />
        </Helmet>
        
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-8 border-4 border-white bg-white/95 shadow-2xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-center text-4xl font-bold text-black">Welcome</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-8">
              <p className="text-xl text-black max-w-2xl mx-auto font-medium">
                Industrial Visit - Compressor Data Collection - Trinity
              </p>
              <div>
                <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to="/compressor-form">Start Form</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
