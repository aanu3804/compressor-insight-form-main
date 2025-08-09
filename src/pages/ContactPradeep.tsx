import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";

const ContactPradeep = () => {
  return (
    <main className="container mx-auto max-w-2xl py-16 space-y-6">
      <Helmet>
        <title>Contact Pradeep | Assistance Required</title>
        <meta name="description" content="For more than 10 compressors, please contact Pradeep for support and a tailored process." />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.href : ""} />
      </Helmet>
      <h1 className="text-3xl font-bold">Please contact Pradeep</h1>
      <p className="text-muted-foreground">You selected more than 10 compressors. For bulk entries, contact Pradeep for assistance.</p>
      <div className="flex gap-3">
        <a href="tel:+910000000000"><Button>Call</Button></a>
        <a href="mailto:pradeep@example.com"><Button variant="secondary">Email</Button></a>
      </div>
    </main>
  );
};

export default ContactPradeep;
