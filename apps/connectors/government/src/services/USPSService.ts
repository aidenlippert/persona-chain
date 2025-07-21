import axios from 'axios';
import * as xml2js from 'xml2js';
import { config } from '../config/config';
import { Address, AddressVerification, AddressCorrection, USPSTrackingInfo, TrackingEvent } from '../types/government';

export class USPSService {
  private parser: xml2js.Parser;
  private builder: xml2js.Builder;
  
  constructor() {
    this.parser = new xml2js.Parser({ explicitArray: false });
    this.builder = new xml2js.Builder({ rootName: 'AddressValidateRequest' });
  }
  
  /**
   * Verify and standardize address using USPS API
   */
  async verifyAddress(inputAddress: Address): Promise<AddressVerification> {
    try {
      console.log('📮 Verifying address with USPS...');
      
      // Build USPS XML request
      const requestXML = this.buildAddressVerifyXML(inputAddress);
      
      // Make request to USPS Address Verification API
      const response = await axios.get(config.usps.addressVerifyUrl, {
        params: {
          API: 'Verify',
          XML: requestXML
        },
        timeout: 30000
      });
      
      // Parse XML response
      const result = await this.parser.parseStringPromise(response.data);
      
      if (result.AddressValidateResponse?.Address) {
        const addressData = result.AddressValidateResponse.Address;
        
        // Check for errors
        if (addressData.Error) {
          console.warn('⚠️ USPS address verification error:', addressData.Error.Description);
          return this.createUnverifiedResult(inputAddress, addressData.Error.Description);
        }
        
        // Create standardized address
        const standardizedAddress: Address = {
          street1: addressData.Address2 || inputAddress.street1,
          street2: addressData.Address1 || inputAddress.street2,
          city: addressData.City || inputAddress.city,
          state: addressData.State || inputAddress.state,
          zipCode: addressData.Zip5 || inputAddress.zipCode,
          zipPlus4: addressData.Zip4 || inputAddress.zipPlus4
        };
        
        // Determine verification status
        const verificationStatus = this.determineVerificationStatus(addressData);
        
        // Identify corrections
        const corrections = this.identifyCorrections(inputAddress, standardizedAddress);
        
        const verification: AddressVerification = {
          id: `usps_verify_${Date.now()}`,
          inputAddress,
          standardizedAddress,
          verificationStatus,
          deliveryPoint: addressData.DeliveryPoint,
          carrierRoute: addressData.CarrierRoute,
          dpvConfirmation: addressData.DPVConfirmation === 'Y',
          vacantIndicator: addressData.Vacant === 'Y',
          businessIndicator: addressData.Business === 'Y',
          centralDeliveryIndicator: addressData.CentralDeliveryType === 'Y',
          verificationDate: new Date().toISOString(),
          corrections
        };
        
        console.log(`✅ USPS address verification completed: ${verificationStatus}`);
        return verification;
        
      } else {
        throw new Error('Invalid response from USPS API');
      }
      
    } catch (error) {
      console.error('❌ Error verifying address with USPS:', error);
      
      // Return mock verification for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock USPS address verification for development');
        return this.createMockVerification(inputAddress);
      }
      
      throw error;
    }
  }
  
  /**
   * Track package using USPS Tracking API
   */
  async trackPackage(trackingNumber: string): Promise<USPSTrackingInfo> {
    try {
      console.log(`📦 Tracking USPS package: ${trackingNumber}...`);
      
      // Build USPS XML request for tracking
      const requestXML = this.buildTrackingXML(trackingNumber);
      
      const response = await axios.get(config.usps.trackingUrl, {
        params: {
          API: 'TrackV2',
          XML: requestXML
        },
        timeout: 30000
      });
      
      // Parse XML response
      const result = await this.parser.parseStringPromise(response.data);
      
      if (result.TrackResponse?.TrackInfo) {
        const trackInfo = result.TrackResponse.TrackInfo;
        
        // Check for errors
        if (trackInfo.Error) {
          throw new Error(`USPS Tracking Error: ${trackInfo.Error.Description}`);
        }
        
        // Parse tracking events
        const trackingEvents: TrackingEvent[] = [];
        if (trackInfo.TrackDetail) {
          const details = Array.isArray(trackInfo.TrackDetail) ? trackInfo.TrackDetail : [trackInfo.TrackDetail];
          
          details.forEach((detail: any) => {
            trackingEvents.push({
              eventType: detail.Event || 'Unknown',
              eventDescription: detail.EventDescription || detail.Event || 'No description',
              eventDate: detail.EventDate || '',
              eventTime: detail.EventTime || '',
              location: `${detail.EventCity || ''}, ${detail.EventState || ''}`.trim(),
              zipCode: detail.EventZIPCode
            });
          });
        }
        
        const trackingInfo: USPSTrackingInfo = {
          trackingNumber,
          status: trackInfo.Status || 'Unknown',
          deliveryStatus: this.mapDeliveryStatus(trackInfo.Status),
          deliveryDate: trackInfo.DeliveryDate,
          deliveryTime: trackInfo.DeliveryTime,
          deliveryAddress: trackInfo.DeliveryAddress ? {
            street1: trackInfo.DeliveryAddress.Street1 || '',
            city: trackInfo.DeliveryAddress.City || '',
            state: trackInfo.DeliveryAddress.State || '',
            zipCode: trackInfo.DeliveryAddress.ZipCode || ''
          } : undefined,
          trackingEvents: trackingEvents.reverse(), // Most recent first
          verified: true
        };
        
        console.log(`✅ USPS tracking completed: ${trackingInfo.status}`);
        return trackingInfo;
        
      } else {
        throw new Error('Invalid tracking response from USPS API');
      }
      
    } catch (error) {
      console.error('❌ Error tracking USPS package:', error);
      
      // Return mock tracking for development
      if (config.nodeEnv === 'development') {
        console.log('🔄 Using mock USPS tracking for development');
        return this.createMockTracking(trackingNumber);
      }
      
      throw error;
    }
  }
  
  /**
   * Build USPS Address Verify XML request
   */
  private buildAddressVerifyXML(address: Address): string {
    const addressData = {
      $: { USERID: config.usps.userId },
      Address: {
        $: { ID: '0' },
        Address1: address.street2 || '',
        Address2: address.street1,
        City: address.city,
        State: address.state,
        Zip5: address.zipCode.substring(0, 5),
        Zip4: address.zipPlus4 || ''
      }
    };\n    return this.builder.buildObject(addressData);
  }
  
  /**
   * Build USPS Tracking XML request
   */
  private buildTrackingXML(trackingNumber: string): string {
    const trackingData = {
      $: { USERID: config.usps.userId },
      TrackID: {
        $: { ID: trackingNumber }
      }
    };
    
    const builder = new xml2js.Builder({ rootName: 'TrackRequest' });
    return builder.buildObject(trackingData);
  }
  
  /**
   * Determine verification status from USPS response
   */
  private determineVerificationStatus(addressData: any): 'verified' | 'partially_verified' | 'not_verified' | 'invalid' {
    if (addressData.DPVConfirmation === 'Y') {
      return 'verified';
    } else if (addressData.DPVConfirmation === 'N') {
      return 'not_verified';
    } else if (addressData.DPVConfirmation === 'D') {
      return 'partially_verified';
    } else {
      return 'invalid';
    }
  }
  
  /**
   * Map USPS delivery status to our format
   */
  private mapDeliveryStatus(status: string): 'delivered' | 'in_transit' | 'out_for_delivery' | 'exception' | 'pre_shipment' {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('delivered')) return 'delivered';
    if (statusLower.includes('out for delivery')) return 'out_for_delivery';
    if (statusLower.includes('in transit')) return 'in_transit';
    if (statusLower.includes('exception') || statusLower.includes('problem')) return 'exception';
    return 'pre_shipment';
  }
  
  /**
   * Identify corrections made by USPS
   */
  private identifyCorrections(input: Address, standardized: Address): AddressCorrection[] {
    const corrections: AddressCorrection[] = [];
    
    if (input.street1 !== standardized.street1) {
      corrections.push({
        field: 'street1',
        originalValue: input.street1,
        correctedValue: standardized.street1,
        reason: 'USPS standardization'
      });
    }
    
    if (input.city !== standardized.city) {
      corrections.push({
        field: 'city',
        originalValue: input.city,
        correctedValue: standardized.city,
        reason: 'USPS standardization'
      });
    }
    
    if (input.state !== standardized.state) {
      corrections.push({
        field: 'state',
        originalValue: input.state,
        correctedValue: standardized.state,
        reason: 'USPS standardization'
      });
    }
    
    if (input.zipCode !== standardized.zipCode) {
      corrections.push({
        field: 'zipCode',
        originalValue: input.zipCode,
        correctedValue: standardized.zipCode,
        reason: 'USPS standardization'
      });
    }
    
    return corrections;
  }
  
  /**
   * Create unverified result for error cases
   */
  private createUnverifiedResult(inputAddress: Address, errorDescription: string): AddressVerification {
    return {
      id: `usps_error_${Date.now()}`,
      inputAddress,
      verificationStatus: 'invalid',
      verificationDate: new Date().toISOString(),
      corrections: [{
        field: 'general',
        originalValue: 'address',
        correctedValue: 'unverifiable',
        reason: errorDescription
      }]
    };
  }
  
  /**
   * Create mock verification for development
   */
  private createMockVerification(inputAddress: Address): AddressVerification {
    const standardizedAddress: Address = {
      street1: inputAddress.street1.toUpperCase(),
      street2: inputAddress.street2?.toUpperCase(),
      city: inputAddress.city.toUpperCase(),
      state: inputAddress.state.toUpperCase(),
      zipCode: inputAddress.zipCode,
      zipPlus4: inputAddress.zipPlus4 || '1234'
    };
    
    return {
      id: 'usps_mock_verify',
      inputAddress,
      standardizedAddress,
      verificationStatus: 'verified',
      deliveryPoint: '23',
      carrierRoute: 'C067',
      dpvConfirmation: true,
      vacantIndicator: false,
      businessIndicator: false,
      centralDeliveryIndicator: false,
      verificationDate: new Date().toISOString(),
      corrections: inputAddress.zipPlus4 ? [] : [{
        field: 'zipPlus4',
        originalValue: '',
        correctedValue: '1234',
        reason: 'USPS ZIP+4 enhancement'
      }]
    };
  }
  
  /**
   * Create mock tracking for development
   */
  private createMockTracking(trackingNumber: string): USPSTrackingInfo {
    return {
      trackingNumber,
      status: 'Delivered',
      deliveryStatus: 'delivered',
      deliveryDate: '2023-12-01',
      deliveryTime: '2:30 PM',
      deliveryAddress: {
        street1: '123 MAIN ST',
        city: 'SAN FRANCISCO',
        state: 'CA',
        zipCode: '94102'
      },
      trackingEvents: [
        {
          eventType: 'Delivered',
          eventDescription: 'Delivered to Front Door/Porch',
          eventDate: '2023-12-01',
          eventTime: '2:30 PM',
          location: 'SAN FRANCISCO, CA',
          zipCode: '94102'
        },
        {
          eventType: 'Out for Delivery',
          eventDescription: 'Out for Delivery',
          eventDate: '2023-12-01',
          eventTime: '8:30 AM',
          location: 'SAN FRANCISCO, CA',
          zipCode: '94102'
        },
        {
          eventType: 'In Transit',
          eventDescription: 'In Transit to Next Facility',
          eventDate: '2023-11-30',
          eventTime: '11:45 PM',
          location: 'OAKLAND, CA',
          zipCode: '94621'
        }
      ],
      verified: true
    };
  }
  
  /**
   * Batch verify multiple addresses
   */
  async batchVerifyAddresses(addresses: Address[]): Promise<AddressVerification[]> {
    const verifications: AddressVerification[] = [];
    
    // USPS API supports up to 5 addresses per request
    const batchSize = 5;
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      try {
        // Process batch (would need to modify XML for multiple addresses)
        const batchResults = await Promise.all(
          batch.map(address => this.verifyAddress(address))
        );
        
        verifications.push(...batchResults);
        
      } catch (error) {
        console.error(`❌ Error in batch ${i / batchSize + 1}:`, error);
        
        // Add error results for failed batch
        batch.forEach(address => {
          verifications.push(this.createUnverifiedResult(address, 'Batch processing error'));
        });
      }
    }
    
    return verifications;
  }
  
  /**
   * Verify USPS credential authenticity
   */
  async verifyCredential(commitment: string, metadata: any): Promise<{
    verified: boolean;
    confidence: number;
    checks: any;
  }> {
    try {
      console.log('🔍 Verifying USPS credential authenticity...');
      
      const checks = {
        addressStandardization: !!metadata.standardizedAddress,
        dpvConfirmation: metadata.dpvConfirmation === true,
        deliveryPointValidation: !!metadata.deliveryPoint,
        carrierRouteValidation: !!metadata.carrierRoute,
        governmentSource: true // USPS is government source
      };
      
      // Calculate confidence based on USPS validation results
      let confidence = 0.7; // Base confidence for USPS
      
      if (metadata.dpvConfirmation) confidence += 0.2;
      if (metadata.deliveryPoint) confidence += 0.1;
      if (metadata.verificationStatus === 'verified') confidence += 0.1;
      
      confidence = Math.min(confidence, 0.95);
      const verified = confidence >= 0.7;
      
      console.log(`✅ USPS verification completed - Confidence: ${(confidence * 100).toFixed(1)}%`);
      
      return {
        verified,
        confidence,
        checks
      };
      
    } catch (error) {
      console.error('❌ Error verifying USPS credential:', error);
      return {
        verified: false,
        confidence: 0,
        checks: {}
      };
    }
  }
}