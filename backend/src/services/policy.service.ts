import { PolicyRepository } from '../repositories/policy.repository';
import { PolicyConfiguration, Prisma } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

export class PolicyService {
  private policyRepository = new PolicyRepository();

  async getDefaultPolicy(): Promise<PolicyConfiguration> {
    const policy = await this.policyRepository.findDefault();
    if (!policy) {
      throw new NotFoundError('Default policy configuration has not been seeded.');
    }
    return policy;
  }

  async getPolicyById(id: string): Promise<PolicyConfiguration> {
    const policy = await this.policyRepository.findById(id);
    if (!policy) {
      throw new NotFoundError(`Policy configuration with ID '${id}' was not found.`);
    }
    return policy;
  }

  async updatePolicy(id: string, data: Prisma.PolicyConfigurationUpdateInput): Promise<PolicyConfiguration> {
    const policy = await this.policyRepository.findById(id);
    if (!policy) {
      throw new NotFoundError(`Policy configuration with ID '${id}' was not found.`);
    }
    return this.policyRepository.update(id, data);
  }
}
