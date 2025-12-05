import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다").max(50, "이름은 50자 이하여야 합니다"),
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  phone: z.string().optional(),
  subject: z.string().min(5, "제목은 5자 이상이어야 합니다").max(100, "제목은 100자 이하여야 합니다"),
  message: z.string().min(10, "내용은 10자 이상이어야 합니다").max(1000, "내용은 1000자 이하여야 합니다"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("inquiries").insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        user_id: user?.id || null,
      });

      if (error) throw error;

      toast.success("문의가 성공적으로 접수되었습니다!");
      form.reset();
    } catch (error) {
      console.error("Failed to submit contact:", error);
      toast.error("문의 접수에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">문의하기</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            궁금한 점이나 제안사항이 있으시면 언제든 연락해 주세요. 빠른 시간 내에 답변 드리겠습니다.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-6">연락처 정보</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border/50">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">이메일</p>
                    <p className="font-medium">support@sourcingmaster.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border/50">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">전화</p>
                    <p className="font-medium">02-1234-5678</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border/50">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">주소</p>
                    <p className="font-medium">서울특별시 강남구 테헤란로 123</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
              <h4 className="font-semibold mb-2">운영 시간</h4>
              <p className="text-sm text-muted-foreground">
                평일: 09:00 - 18:00<br />
                주말 및 공휴일: 휴무
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-background p-8 rounded-xl border border-border/50 shadow-lg">
            <h3 className="text-xl font-semibold mb-6">메시지 보내기</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이름 *</FormLabel>
                        <FormControl>
                          <Input placeholder="홍길동" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이메일 *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="example@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>연락처</FormLabel>
                      <FormControl>
                        <Input placeholder="010-0000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목 *</FormLabel>
                      <FormControl>
                        <Input placeholder="문의 제목을 입력해주세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>내용 *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="문의 내용을 자세히 입력해주세요"
                          className="min-h-[140px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full gap-2"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isSubmitting ? "전송 중..." : "메시지 보내기"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}
