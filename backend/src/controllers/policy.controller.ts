import { Request, Response } from 'express';
import { PolicyService } from '../services/policy.service';

export class PolicyController {
  private policyService = new PolicyService();

  getDefault = async (_req: Request, res: Response): Promise<void> => {
    const policy = await this.policyService.getDefaultPolicy();
    
    res.status(200).json({
      success: true,
      data: policy
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const policy = await this.policyService.updatePolicy(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Visual protection policy successfully updated.',
      data: policy
    });
  };
}
