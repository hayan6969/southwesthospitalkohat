import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, User, Lock, Mail, Phone } from 'lucide-react';

export default function Auth() {
  const { signIn, signUp, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPatientLogin, setIsPatientLogin] = useState(false);

  // Login form state for regular users
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Patient login form state
  const [patientLoginData, setPatientLoginData] = useState({
    phone: '',
    cnic: '',
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    cnic: '',
    confirmCnic: '',
    date_of_birth: '',
    address: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let email, password;
      
      if (isPatientLogin) {
        // Use phone as email and CNIC as password for patient login
        const cleanPhone = patientLoginData.phone.replace(/\D/g, ''); // Remove non-digits
        email = `patient${cleanPhone}@hims.app`;
        password = patientLoginData.cnic;
      } else {
        // Regular email/password login for staff, doctors, admins
        email = loginData.email;
        password = loginData.password;
      }

      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: isPatientLogin ? 'Invalid phone number or CNIC' : 'Invalid email or password',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login Successful',
          description: 'Redirecting to your dashboard...',
        });
        // Redirect will be handled by the auth context and Index page
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (signupData.cnic !== signupData.confirmCnic) {
      toast({
        title: 'CNIC Mismatch',
        description: 'CNIC numbers do not match',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (signupData.cnic.length < 13) {
      toast({
        title: 'Invalid CNIC',
        description: 'CNIC must be at least 13 characters long',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      // Use phone as email and CNIC as password for patient signup
      // Format phone number to create a valid email
      const cleanPhone = signupData.phone.replace(/\D/g, ''); // Remove non-digits
      const email = `patient${cleanPhone}@hims.app`;
      const { error } = await signUp(email, signupData.cnic, {
        first_name: signupData.first_name,
        last_name: signupData.last_name,
        role: 'patient'
      });

      if (error) {
        toast({
          title: 'Signup Failed',
          description: error.message || 'Failed to create account',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account Created',
          description: 'Signing you in...',
        });
        
        // Automatically sign in the user after successful signup
        try {
          const { error: signInError } = await signIn(email, signupData.cnic);
          if (signInError) {
            toast({
              title: 'Account Created',
              description: 'Please login with your phone number and CNIC',
            });
          } else {
            toast({
              title: 'Welcome!',
              description: 'Redirecting to your dashboard...',
            });
          }
        } catch (signInError) {
          toast({
            title: 'Account Created',
            description: 'Please login with your phone number and CNIC',
          });
        }
        
        // Clear form
        setSignupData({
          first_name: '',
          last_name: '',
          phone: '',
          cnic: '',
          confirmCnic: '',
          date_of_birth: '',
          address: '',
        });
      }
    } catch (error) {
      toast({
        title: 'Signup Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <span className="inline-block w-3 h-10 bg-blue-500 rounded-full" />
            HIMS
          </h1>
          <p className="text-gray-600">Hospital Information Management System</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new patient account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Patient Signup</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      id="patientLogin"
                      checked={isPatientLogin}
                      onChange={(e) => setIsPatientLogin(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="patientLogin" className="text-sm font-medium">
                      Patient Login (Phone & CNIC)
                    </Label>
                  </div>

                  {isPatientLogin ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="patient_phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="patient_phone"
                            type="tel"
                            placeholder="03001234567"
                            value={patientLoginData.phone}
                            onChange={(e) => setPatientLoginData({ ...patientLoginData, phone: e.target.value })}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="patient_cnic">CNIC</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="patient_cnic"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="12345-6789012-3"
                            value={patientLoginData.cnic}
                            onChange={(e) => setPatientLoginData({ ...patientLoginData, cnic: e.target.value })}
                            className="pl-10 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            className="pl-10 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="first_name"
                          type="text"
                          placeholder="First name"
                          value={signupData.first_name}
                          onChange={(e) => setSignupData({ ...signupData, first_name: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="last_name"
                          type="text"
                          placeholder="Last name"
                          value={signupData.last_name}
                          onChange={(e) => setSignupData({ ...signupData, last_name: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup_phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup_phone"
                        type="tel"
                        placeholder="03001234567"
                        value={signupData.phone}
                        onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup_cnic">CNIC</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup_cnic"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="12345-6789012-3"
                        value={signupData.cnic}
                        onChange={(e) => setSignupData({ ...signupData, cnic: e.target.value })}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm_cnic">Confirm CNIC</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirm_cnic"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm your CNIC"
                        value={signupData.confirmCnic}
                        onChange={(e) => setSignupData({ ...signupData, confirmCnic: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth (Optional)</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={signupData.date_of_birth}
                      onChange={(e) => setSignupData({ ...signupData, date_of_birth: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address (Optional)</Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="Your address"
                      value={signupData.address}
                      onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Patient Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
