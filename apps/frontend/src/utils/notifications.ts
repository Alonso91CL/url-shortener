import Swal from 'sweetalert2';

export type ToastPosition = 'top' | 'top-start' | 'top-end' | 'center' | 'center-start' | 'center-end' | 'bottom' | 'bottom-start' | 'bottom-end';

const defaultOptions = {
  background: '#1a1a1a',
  color: '#e5e5e5',
  confirmButtonColor: '#22c55e',
  cancelButtonColor: '#52525b',
  timerProgressBar: true,
};

export const toast = Swal.mixin({
  ...defaultOptions,
  toast: true,
  position: 'top-end' as ToastPosition,
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export function notifySuccess(message: string) {
  return toast.fire({
    icon: 'success',
    title: message,
  });
}

export function notifyError(message: string) {
  return toast.fire({
    icon: 'error',
    title: message,
    timer: 5000,
  });
}

export function notifyInfo(message: string) {
  return toast.fire({
    icon: 'info',
    title: message,
  });
}

export function notifyWarning(message: string) {
  return toast.fire({
    icon: 'warning',
    title: message,
    timer: 4000,
  });
}

export async function confirmDelete(title: string, text: string): Promise<boolean> {
  const result = await Swal.fire({
    ...defaultOptions,
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export function confirmSuccess(title: string, message?: string) {
  return Swal.fire({
    ...defaultOptions,
    icon: 'success',
    title,
    text: message,
    timer: 3000,
    showConfirmButton: false,
  });
}
