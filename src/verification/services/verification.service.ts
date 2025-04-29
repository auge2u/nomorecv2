import { Verification } from '../interfaces/models';
import supabase from '../core/supabase';
import logger from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import config from '../config';

/**
 * Service for managing credential verifications
 */
export class VerificationService {
  /**
   * Get a verification by ID
   */
  async getVerificationById(verificationId: string): Promise<Verification> {
    try {
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('id', verificationId)
        .single();

      if (error) {
        logger.error('Error fetching verification', { error, verificationId });
        throw new AppError(`Verification not found: ${error.message}`, 404);
      }

      return data as Verification;
    } catch (error) {
      logger.error('Error in getVerificationById', { error, verificationId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch verification', 500);
    }
  }

  /**
   * Get verifications for an entity
   */
  async getVerificationsForEntity(entityId: string, entityType: string): Promise<Verification[]> {
    try {
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('entityId', entityId)
        .eq('entityType', entityType);

      if (error) {
        logger.error('Error fetching verifications for entity', { error, entityId, entityType });
        throw new AppError(`Failed to fetch verifications: ${error.message}`, 400);
      }

      return data as Verification[];
    } catch (error) {
      logger.error('Error in getVerificationsForEntity', { error, entityId, entityType });
      throw error instanceof AppError ? error : new AppError('Failed to fetch verifications', 500);
    }
  }

  /**
   * Create a new verification request
   */
  async createVerification(verification: Omit<Verification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Verification> {
    try {
      const { data, error } = await supabase
        .from('verifications')
        .insert([{
          ...verification,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating verification', { error, verification });
        throw new AppError(`Failed to create verification: ${error.message}`, 400);
      }

      // If using blockchain verification, initiate the blockchain verification process
      if (verification.verifierType === 'blockchain') {
        await this.initiateBlockchainVerification(data.id, verification);
      }

      return data as Verification;
    } catch (error) {
      logger.error('Error in createVerification', { error, verification });
      throw error instanceof AppError ? error : new AppError('Failed to create verification', 500);
    }
  }

  /**
   * Update verification status
   */
  async updateVerificationStatus(verificationId: string, status: 'pending' | 'verified' | 'rejected', proofData?: string): Promise<Verification> {
    try {
      const { data, error } = await supabase
        .from('verifications')
        .update({
          status,
          proofData: proofData || undefined,
          updatedAt: new Date()
        })
        .eq('id', verificationId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating verification status', { error, verificationId, status });
        throw new AppError(`Failed to update verification status: ${error.message}`, 400);
      }

      return data as Verification;
    } catch (error) {
      logger.error('Error in updateVerificationStatus', { error, verificationId, status });
      throw error instanceof AppError ? error : new AppError('Failed to update verification status', 500);
    }
  }

  /**
   * Initiate blockchain verification process
   * This is a placeholder for the actual blockchain integration
   */
  private async initiateBlockchainVerification(verificationId: string, verification: Partial<Verification>): Promise<void> {
    try {
      logger.info('Initiating blockchain verification', { verificationId, blockchain: config.blockchain.provider });
      
      // This would be replaced with actual blockchain integration code
      // For now, we'll just simulate a successful verification after a delay
      setTimeout(async () => {
        try {
          // Generate a mock proof data (this would be the actual blockchain transaction or ZKP)
          const mockProofData = JSON.stringify({
            txHash: `${config.blockchain.provider}_${Math.random().toString(36).substring(2, 15)}`,
            timestamp: new Date().toISOString(),
            network: config.blockchain.network,
            verified: true
          });
          
          await this.updateVerificationStatus(verificationId, 'verified', mockProofData);
          logger.info('Blockchain verification completed successfully', { verificationId });
        } catch (error) {
          logger.error('Error completing blockchain verification', { error, verificationId });
        }
      }, 5000); // Simulate 5-second verification process
    } catch (error) {
      logger.error('Error initiating blockchain verification', { error, verificationId });
      throw new AppError('Failed to initiate blockchain verification', 500);
    }
  }
}

export default new VerificationService();
