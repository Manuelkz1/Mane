// NOTE: TwilioService is no longer used
// SMS authentication is now handled natively by Supabase Auth
// This file is kept for reference but not imported anywhere

class TwilioService {
  private baseUrl = 'https://api.twilio.com/2010-04-01';
  private verificationCodes = new Map<string, { code: string; expires: number }>();

  constructor() {
    // Almacenamos códigos temporalmente para simulación en desarrollo
  }

  // Enviar código de verificación SMS
  async sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!accountSid || !authToken || !serviceSid) {
        throw new Error('Twilio credentials not configured');
      }

      // Formatear número de teléfono (agregar +57 para Colombia si no tiene código de país)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Crear credenciales base64 para autenticación
      const credentials = btoa(`${accountSid}:${authToken}`);

      const response = await fetch(`${this.baseUrl}/Services/${serviceSid}/Verifications`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          Channel: 'sms'
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'pending') {
        return {
          success: true,
          message: `Código de verificación enviado a ${this.maskPhoneNumber(formattedPhone)}`
        };
      } else {
        return {
          success: false,
          message: data.message || 'Error al enviar el código de verificación'
        };
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        message: error.message || 'Error al enviar SMS'
      };
    }
  }

  // Verificar código SMS
  async verifyCode(phoneNumber: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!accountSid || !authToken || !serviceSid) {
        throw new Error('Twilio credentials not configured');
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Crear credenciales base64 para autenticación
      const credentials = btoa(`${accountSid}:${authToken}`);

      const response = await fetch(`${this.baseUrl}/Services/${serviceSid}/VerificationCheck`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          Code: code
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'approved') {
        return {
          success: true,
          message: 'Número verificado correctamente'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Código incorrecto o expirado'
        };
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      return {
        success: false,
        message: error.message || 'Error al verificar código'
      };
    }
  }

  // Formatear número de teléfono
  private formatPhoneNumber(phoneNumber: string): string {
    // Remover espacios y caracteres especiales
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Si empieza con 0, removerlo (número local)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Si no tiene código de país, agregar +57 (Colombia)
    if (!cleaned.startsWith('57') && cleaned.length === 10) {
      cleaned = '57' + cleaned;
    }
    
    // Agregar el signo +
    return '+' + cleaned;
  }

  // Enmascarar número para mostrar
  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      const countryCode = cleaned.substring(0, cleaned.length - 10);
      const areaCode = cleaned.substring(cleaned.length - 10, cleaned.length - 7);
      const lastDigits = cleaned.substring(cleaned.length - 4);
      return `+${countryCode} ${areaCode}***${lastDigits}`;
    }
    return phoneNumber;
  }

  // Validar formato de número de teléfono
  isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Aceptar números de 10 dígitos (locales) o 12 dígitos (con código de país)
    return cleaned.length === 10 || cleaned.length === 12;
  }
}

export const twilioService = new TwilioService();
