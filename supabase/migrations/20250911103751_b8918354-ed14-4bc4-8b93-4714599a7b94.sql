-- Create missing RLS policies for convites table
CREATE POLICY "Super admins can manage all invites" ON public.convites
  FOR ALL USING (public.user_has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Proprietarias and gerentes can manage invites for their organization" ON public.convites
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND organizacao_id = public.convites.organizacao_id 
        AND role IN ('proprietaria', 'gerente')
        AND ativo = true
    )
  );

-- Create missing RLS policies for profissionais_especialidades table  
CREATE POLICY "Users can view their own specialties" ON public.profissionais_especialidades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own specialties" ON public.profissionais_especialidades
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Proprietarias and gerentes can view team specialties" ON public.profissionais_especialidades
  FOR SELECT USING (
    public.user_has_role(auth.uid(), 'super_admin') OR
    EXISTS(
      SELECT 1 FROM public.user_roles ur1
      JOIN public.user_roles ur2 ON ur1.organizacao_id = ur2.organizacao_id
      WHERE ur1.user_id = auth.uid() 
        AND ur1.role IN ('proprietaria', 'gerente')
        AND ur1.ativo = true
        AND ur2.user_id = public.profissionais_especialidades.user_id
        AND ur2.ativo = true
    )
  );