export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export class Logger {
  private static debugEnabled = true; // Set to true by default for MVP stabilization checking

  public static setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  public static isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  public static debug(module: string, message: string, ...args: any[]): void {
    if (!this.debugEnabled) return;
    console.debug(
      `%c[PrivacyShield][DEBUG][${module}] %c${message}`,
      'color: #94a3b8; font-weight: bold;',
      'color: inherit;',
      ...args
    );
  }

  public static info(module: string, message: string, ...args: any[]): void {
    console.log(
      `%c[PrivacyShield][INFO][${module}] %c${message}`,
      'color: #3b82f6; font-weight: bold;',
      'color: inherit;',
      ...args
    );
  }

  public static warn(module: string, message: string, ...args: any[]): void {
    console.warn(
      `%c[PrivacyShield][WARN][${module}] %c${message}`,
      'color: #f59e0b; font-weight: bold;',
      'color: inherit;',
      ...args
    );
  }

  public static error(module: string, message: string, ...args: any[]): void {
    console.error(
      `%c[PrivacyShield][ERROR][${module}] %c${message}`,
      'color: #ef4444; font-weight: bold;',
      'color: inherit;',
      ...args
    );
  }
}
