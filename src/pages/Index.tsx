import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <Helmet>
        <title>Compressor Data Collection | Start</title>
        <meta name="description" content="Clean, modern, mobile-friendly multi-step form to collect compressor details with photos." />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.href : ""} />
      </Helmet>
      <section className="text-center space-y-6 px-6">
        <h1 className="text-4xl font-bold">Welcome</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">Industrial Visit - Compressor Data Collection - Trinity.</p>
        <div>
          <Button asChild>
            <Link to="/compressor-form">Start Form</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default Index;
