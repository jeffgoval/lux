/**
 * Tests for NovoClienteModal component
 * Verifies form validation, submission, and file upload functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NovoClienteModal } from '@/components/modals/NovoClienteModal';
import { NotificationProvider } from '@/components/notifications/NotificationSystem';

// Mock the hooks and services
jest.mock('@/hooks/useCliente', () => ({
  useCliente: () => ({
    createCliente: jest.fn().mockResolvedValue({ id: '1', nome: 'Test Client' }),
    updateCliente: jest.fn().mockResolvedValue({ id: '1', nome: 'Updated Client' }),
    uploadAvatar: jest.fn().mockResolvedValue('http://example.com/avatar.jpg'),
    uploadDocument: jest.fn().mockResolvedValue('http://example.com/document.pdf'),
    checkEmailExists: jest.fn().mockResolvedValue(false),
    loading: false,
    uploadingAvatar: false,
    uploadingDocument: false,
  }),
}));

jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({ onClick: jest.fn() }),
    getInputProps: () => ({ type: 'file' }),
    isDragActive: false,
  }),
}));

const renderModal = (props = {}) => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSuccess: jest.fn(),
    ...props,
  };

  return render(
    <NotificationProvider>
      <NovoClienteModal {...defaultProps} />
    </NotificationProvider>
  );
};

describe('NovoClienteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with correct title for new client', () => {
    renderModal();
    expect(screen.getByText('Novo Cliente')).toBeInTheDocument();
  });

  it('renders the modal with correct title for editing client', () => {
    renderModal({ isEdit: true });
    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
  });

  it('displays all required form fields', () => {
    renderModal();
    
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/consentimento/i)).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    renderModal();

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /criar cliente/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nome deve ter pelo menos 2 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/telefone é obrigatório/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderModal();

    const emailInput = screen.getByLabelText(/e-mail/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('formats phone number correctly', async () => {
    const user = userEvent.setup();
    renderModal();

    const phoneInput = screen.getByLabelText(/telefone/i);
    await user.type(phoneInput, '11999999999');

    await waitFor(() => {
      expect(phoneInput).toHaveValue('(11) 99999-9999');
    });
  });

  it('formats CPF correctly', async () => {
    const user = userEvent.setup();
    renderModal();

    // Navigate to the first tab to access CPF field
    const cpfInput = screen.getByLabelText(/cpf/i);
    await user.type(cpfInput, '12345678901');

    await waitFor(() => {
      expect(cpfInput).toHaveValue('123.456.789-01');
    });
  });

  it('requires consent checkbox to be checked', async () => {
    const user = userEvent.setup();
    renderModal();

    // Fill required fields but don't check consent
    await user.type(screen.getByLabelText(/nome completo/i), 'Test Client');
    await user.type(screen.getByLabelText(/e-mail/i), 'test@example.com');
    await user.type(screen.getByLabelText(/telefone/i), '11999999999');

    // Navigate to additional tab
    await user.click(screen.getByRole('tab', { name: /adicionais/i }));

    const submitButton = screen.getByRole('button', { name: /criar cliente/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/é necessário aceitar os termos de consentimento/i)).toBeInTheDocument();
    });
  });

  it('has file upload sections for avatar and documents', () => {
    renderModal();

    // Navigate to files tab
    fireEvent.click(screen.getByRole('tab', { name: /arquivos/i }));

    expect(screen.getByText(/foto do cliente/i)).toBeInTheDocument();
    expect(screen.getByText(/documentos/i)).toBeInTheDocument();
  });

  it('displays all tabs correctly', () => {
    renderModal();

    expect(screen.getByRole('tab', { name: /dados pessoais/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /endereço/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /arquivos/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /adicionais/i })).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    renderModal({ onOpenChange });

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});