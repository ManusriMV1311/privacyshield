import { prisma } from '../server';
import { PolicyConfiguration, Prisma } from '@prisma/client';

export class PolicyRepository {
  async findByName(name: string): Promise<PolicyConfiguration | null> {
    return prisma.policyConfiguration.findUnique({
      where: { name }
    });
  }

  async findById(id: string): Promise<PolicyConfiguration | null> {
    return prisma.policyConfiguration.findUnique({
      where: { id }
    });
  }

  async findDefault(): Promise<PolicyConfiguration | null> {
    return prisma.policyConfiguration.findUnique({
      where: { name: 'default' }
    });
  }

  async update(id: string, data: Prisma.PolicyConfigurationUpdateInput): Promise<PolicyConfiguration> {
    return prisma.policyConfiguration.update({
      where: { id },
      data
    });
  }
}
