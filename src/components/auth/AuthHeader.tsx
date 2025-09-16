import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";

export function AuthHeader() {
  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Entrar
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button variant="premium" size="sm" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Cadastrar
          </Button>
        </SignUpButton>
      </SignedOut>
      
      <SignedIn>
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
              userButtonPopoverCard: "shadow-elegant border border-border",
              userButtonPopoverActionButton: "hover:bg-accent hover:text-accent-foreground",
              userButtonPopoverActionButtonText: "text-sm",
              userButtonPopoverFooter: "hidden"
            }
          }}
          showName={false}
          userProfileMode="modal"
        />
      </SignedIn>
    </div>
  );
}