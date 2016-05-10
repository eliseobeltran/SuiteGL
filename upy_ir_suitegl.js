/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
* @ AUTHOR        : diane@upaya
* @ DATE          :  April 2016
*
* Copyright (c) 2016 Upaya - The Solution Inc.
* 4300 Stevens Creek Blvd Suite # 218, San Jose, CA 95129
* All Rights Reserved.
*
* This software is the confidential and proprietary information of 
* Upaya - The Solution Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with Upaya.
*
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
function customizeGlImpact(transactionRecord, standardLines, customLines, book)
{
	var arrAccounts = getAcctFromPOTypes();	
	if(!arrAccounts) return;	
	var stCreatedFrm = transactionRecord.getFieldValue('createdfrom');
	var stInvestigateStatus = transactionRecord.getFieldValue('custbody_upy_inspection_stat');
	//if(stInvestigateStatus!=2) return;
	nlapiLogExecution('DEBUG','DEBUG','stInvestigateStatus=' + stInvestigateStatus);
	
	nlapiLogExecution('DEBUG','SUITEGL - ITEM RECEIPT','**********START**********');
	
	var PENDING_APPROVAL = 1;
	var APPROVED = 2;
	var REJECTED = 3;
	var ACCOUNT_2250 = 115;//2250 Other Current Liability : Accrued Purchases
	var stPOType = transactionRecord.getFieldValue('custbody_po_type');
	var stDebitAcct = arrAccounts['potype-' + stPOType];	
	var stItemCount = transactionRecord.getLineItemCount('item');
	
	for(var i = 1; i<=stItemCount; i++)
	{
		var stItem   = transactionRecord.getLineItemValue('item','item',i);
		var fReject  = transactionRecord.getLineItemValue('item','custcol_inspection_rejected_qty',i);
			fReject  = (fReject) ? parseFloat(fReject) : 0;
		var fApprove = transactionRecord.getLineItemValue('item','custcol_inspection_approved_qty',i);
			fApprove = (fApprove) ? parseFloat(fApprove) : 0;
		var fQty 	 = transactionRecord.getLineItemValue('item','quantity',i);
			fQty 	 = (fQty) ? parseFloat(fQty) : 0;
		var fRate	 = transactionRecord.getLineItemValue('item','rate',i);
			fRate	 = (fRate) ? parseFloat(fRate) : 0;
		var fAmt     = transactionRecord.getLineItemValue('item','custcol_upy_po_amt',i);
			fAmt	 = (fAmt) ? parseFloat(fAmt) : 0;
		var bInspect = transactionRecord.getLineItemValue('item','custcol_upy_for_inspection',i);
		
		if(fAmt==0) continue;
		
		if((stInvestigateStatus==APPROVED || stInvestigateStatus==REJECTED) && bInspect=='T')
		{
			if(fApprove==fQty && fApprove!=0) //all quantity approved
			{
				var crAssetAcct  = nlapiLookupField('item',stItem,'assetaccount');
				if(!crAssetAcct || !stDebitAcct) continue;
				
				var newLine1 = customLines.addNewLine();				
				newLine1.setCreditAmount(fAmt);				
				newLine1.setAccountId(parseInt(crAssetAcct));				
				newLine1.setMemo(crAssetAcct);
				
				var newLine2 = customLines.addNewLine();				
				newLine2.setDebitAmount(fAmt);				
				newLine2.setAccountId(parseInt(stDebitAcct));				
				newLine2.setMemo(stDebitAcct);
			}
			else if(fReject!=0 && fReject!=fQty) //some quantity approved some rejected
			{
				var stAssetAcct = nlapiLookupField('item',stItem,'assetaccount');
				if(!stAssetAcct) continue;
							
				if(fReject!=0)
				{
					var dbAssetAcct = stAssetAcct;
					var fRejAmt = (fReject * fRate).toFixed(2);
					
					if(fRejAmt==0 || !ACCOUNT_2250) continue;
					
					var newLine1 = customLines.addNewLine();				
					newLine1.setCreditAmount(parseFloat(fRejAmt));				
					newLine1.setAccountId(parseInt(ACCOUNT_2250));				
					newLine1.setMemo(ACCOUNT_2250);
									
					var newLine2 = customLines.addNewLine();				
					newLine2.setDebitAmount(parseFloat(fRejAmt));				
					newLine2.setAccountId(parseInt(dbAssetAcct));				
					newLine2.setMemo(dbAssetAcct);
				}
				
				if(fApprove!=0)
				{
					var crAssetAcct  = stAssetAcct;
					var fApprAmt = (fApprove * fRate).toFixed(2);
					if(fApprAmt==0 || !stDebitAcct) continue;
					
					var newLine1 = customLines.addNewLine();				
					newLine1.setCreditAmount(parseFloat(fApprAmt));				
					newLine1.setAccountId(parseInt(crAssetAcct));				
					newLine1.setMemo(crAssetAcct);
					
					var newLine2 = customLines.addNewLine();				
					newLine2.setDebitAmount(parseFloat(fApprAmt));				
					newLine2.setAccountId(parseInt(stDebitAcct));				
					newLine2.setMemo(stDebitAcct);
				}
			}
			else if(fReject==fQty && fReject!=0) // all quantity rejected
			{
				var stAssetAcct = nlapiLookupField('item',stItem,'assetaccount');
				if(!stAssetAcct) continue;
				
				if(bInspect=='T')
				{
					var dbAcct  = stAssetAcct;
					if(!dbAcct || !ACCOUNT_2250) continue;
					
					var newLine1 = customLines.addNewLine();				
					newLine1.setCreditAmount(fAmt);				
					newLine1.setAccountId(parseInt(ACCOUNT_2250));				
					newLine1.setMemo(ACCOUNT_2250);
					
					var newLine2 = customLines.addNewLine();				
					newLine2.setDebitAmount(fAmt);				
					newLine2.setAccountId(parseInt(dbAcct));				
					newLine2.setMemo(dbAcct);
				}			
			}
		}		
		else if(bInspect=='F' || stInvestigateStatus==PENDING_APPROVAL || !stInvestigateStatus)
		{
			var crAssetAcct = nlapiLookupField('item',stItem,'assetaccount');
			nlapiLogExecution('DEBUG','DEBUG','crAssetAcct=' + crAssetAcct + ' fAmt=' + fAmt + ' stDebitAcct=' + stDebitAcct);
				
			if(!crAssetAcct || !stDebitAcct) continue;
			
			var newLine1 = customLines.addNewLine();				
			newLine1.setCreditAmount(fAmt);				
			newLine1.setAccountId(parseInt(crAssetAcct));				
			newLine1.setMemo(crAssetAcct);
			
			var newLine2 = customLines.addNewLine();				
			newLine2.setDebitAmount(fAmt);				
			newLine2.setAccountId(parseInt(stDebitAcct));				
			newLine2.setMemo(stDebitAcct);
		}
	}
	nlapiLogExecution('DEBUG','SUITEGL - ITEM RECEIPT','**********END**********');	
}


function getAcctFromPOTypes()
{
	var arrPOTypes = [];
	arrPOTypes['potype-' + 1] = '387'; //Spacecraft : Prototype Hardware: Optical
	arrPOTypes['potype-' + 2] = '388'; //Spacecraft : Prototype Hardware: Electrical
	arrPOTypes['potype-' + 3] = '389'; //Spacecraft : Prototype Hardware: Mechanical
	arrPOTypes['potype-' + 4] = '1239'; //Spacecraft : Prototype Hardware: Other
	arrPOTypes['potype-' + 5] = '381'; //Spacecraft : Flight Hardware - Production
	arrPOTypes['potype-' + 6] = '380'; //Spacecraft : Flight Hardware - Experimental
	arrPOTypes['potype-' + 7] = '385'; //Spacecraft : Qualification Testing
	arrPOTypes['potype-' + 8] = '382'; //Spacecraft : Lab Supplies
	arrPOTypes['potype-' + 9] = '383'; //Spacecraft : Lab Equipment (<$1000)
	arrPOTypes['potype-' + 10] = '384'; //Spacecraft : Lab Equipment Rental and Leases
	arrPOTypes['potype-' + 11] = '1247'; //Spacecraft : Spacecraft : Other
	arrPOTypes['potype-' + 12] = '1231'; //Lab Equipment : Lab Equipment - Asset (>$1000)
	arrPOTypes['potype-' + 13] = '399'; //Spacecraft : Software Applications
	arrPOTypes['potype-' + 14] = '944'; //GS Dish hardware
	arrPOTypes['potype-' + 15] = '944'; //GS Site Build
	arrPOTypes['potype-' + 16] = '374'; //GS R&D Supplies/Equipment
	arrPOTypes['potype-' + 17] = '358'; //GS Land (Lease or Rent)
	arrPOTypes['potype-' + 18] = '365'; //GS Communications Services
	arrPOTypes['potype-' + 19] = '1248'; //GS Utility Services
	arrPOTypes['potype-' + 20] = '377'; //GS Maintenance Services or Contracts
	arrPOTypes['potype-' + 21] = '2241'; //GS Other services
	arrPOTypes['potype-' + 22] = '398'; //Data/SW hosting
	arrPOTypes['potype-' + 23] = '429'; //Analysis/Support
	
	return arrPOTypes;
}