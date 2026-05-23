import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const user = await this.authService.register(email, password);
    
    const { passwordHash, ...safeUser } = user;
    res.status(201).json({
      success: true,
      message: 'Dashboard user successfully registered.',
      data: safeUser
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: result
    });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const result = await this.authService.refresh(refreshToken);

    res.status(200).json({
      success: true,
      data: result
    });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: req.user
    });
  };
}
