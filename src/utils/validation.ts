const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value: string, label: string) {
  if (!value.trim()) {
    return `${label} không được để trống.`;
  }
  return null;
}

export function validateEmail(value: string) {
  const required = validateRequired(value, 'Email');
  if (required) {
    return required;
  }

  if (!EMAIL_REGEX.test(value.trim())) {
    return 'Email không đúng định dạng.';
  }

  return null;
}

export function validatePasswordStrength(password: string) {
  if (!password.trim()) {
    return 'Mật khẩu không được để trống.';
  }

  if (password.length < 6) {
    return 'Mật khẩu phải có ít nhất 6 ký tự.';
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'Mật khẩu cần có chữ hoa, chữ thường và số.';
  }

  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword.trim()) {
    return 'Vui lòng nhập lại mật khẩu.';
  }

  if (password !== confirmPassword) {
    return 'Mật khẩu nhập lại không khớp.';
  }

  return null;
}
