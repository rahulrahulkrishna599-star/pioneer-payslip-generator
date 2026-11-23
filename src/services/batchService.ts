import { supabase } from '../lib/supabase';
import { BatchHistoryItem, CompanySettings, EmployeeRecord, PayslipTemplate } from '../types';

export async function fetchBatchesFromSupabase(): Promise<BatchHistoryItem[]> {
  try {
    const { data: batches, error } = await supabase
      .from('payroll_batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !batches) {
      console.warn('Could not fetch batches from Supabase:', error?.message);
      return [];
    }

    // Fetch associated employees for each batch
    const batchItems: BatchHistoryItem[] = [];

    for (const b of batches) {
      const { data: emps } = await supabase
        .from('payroll_employees')
        .select('*')
        .eq('batch_id', b.id);

      const transformedEmployees: EmployeeRecord[] = (emps || []).map((row) => ({
        id: row.employee_id,
        name: row.name,
        department: row.department || '',
        designation: row.designation || '',
        position: row.position || 'Full Time',
        branch: row.branch || 'Coimbatore',
        location: row.location || 'Coimbatore',
        mobile: row.mobile || '',
        doj: row.doj || '',
        dob: row.dob || '',
        paidDays: Number(row.paid_days) || 0,
        lopDays: Number(row.lop_days) || 0,
        payPeriod: row.pay_period || b.pay_period,
        payDate: row.pay_date || b.pay_date,
        taxRegime: row.tax_regime || 'Regular',
        ptState: row.pt_state || 'Tamil Nadu',
        uanNumber: row.uan_number || '',
        esiNumber: row.esi_number || '',
        pfAccountNumber: row.pf_account_number || '',
        panNumber: row.pan_number || '',
        bankName: row.bank_name || '',
        bankAccountNumber: row.bank_account_number || '',
        
        basic: row.earnings_breakdown?.basic || { fixed: 0, earned: 0, arrears: 0, total: 0 },
        hra: row.earnings_breakdown?.hra || { fixed: 0, earned: 0, arrears: 0, total: 0 },
        washingAllowance: row.earnings_breakdown?.washingAllowance || { fixed: 0, earned: 0, arrears: 0, total: 0 },
        incentive: row.earnings_breakdown?.incentive || { fixed: 0, earned: 0, arrears: 0, total: 0 },
        otherAllowance: row.earnings_breakdown?.otherAllowance || { fixed: 0, earned: 0, arrears: 0, total: 0 },
        previousMonth: row.earnings_breakdown?.previousMonth || { fixed: 0, earned: 0, arrears: 0, total: 0 },
        additionalEarnings: row.earnings_breakdown?.additionalEarnings || [],
        grossEarnings: Number(row.earnings_breakdown?.grossEarnings) || 0,

        providentFund: Number(row.deductions_breakdown?.providentFund) || 0,
        esi: Number(row.deductions_breakdown?.esi) || 0,
        tds: Number(row.deductions_breakdown?.tds) || 0,
        professionalTax: Number(row.deductions_breakdown?.professionalTax) || 0,
        otherDeduction: Number(row.deductions_breakdown?.otherDeduction) || 0,
        additionalDeductions: row.deductions_breakdown?.additionalDeductions || [],
        totalDeductions: Number(row.deductions_breakdown?.totalDeductions) || 0,

        calculatedNetPayable: Number(row.calculated_net_payable) || 0,
        sourceNetPayable: row.source_net_payable ? Number(row.source_net_payable) : undefined,
        netMismatch: Boolean(row.net_mismatch),
        validationStatus: row.validation_status || 'ready',
        validationErrors: [],
        validationWarnings: [],
        rawRow: {},
      }));

      const item: BatchHistoryItem = {
        id: b.id,
        date: new Date(b.created_at).toLocaleString('en-GB'),
        fileName: b.file_name,
        payPeriod: b.pay_period,
        templateName: 'Pioneer Form T - Wages Slip',
        totalCount: b.total_count,
        successCount: b.success_count,
        failedCount: b.failed_count,
        employees: transformedEmployees,
      };

      (item as any).zipStoragePath = b.zip_storage_path;
      batchItems.push(item);
    }

    return batchItems;
  } catch (err) {
    console.error('Failed to load batch history from Supabase:', err);
    return [];
  }
}

export async function saveBatchToSupabase(
  batch: BatchHistoryItem,
  zipBlob?: Blob
): Promise<string | null> {
  try {
    let zipStoragePath: string | null = null;

    // 1. Upload ZIP to Supabase Storage if provided
    if (zipBlob) {
      const storageKey = `${batch.id}_${batch.payPeriod.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('payroll-archives')
        .upload(storageKey, zipBlob, {
          contentType: 'application/zip',
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        zipStoragePath = uploadData.path;
      } else if (uploadErr) {
        console.warn('Could not upload ZIP to Supabase Storage:', uploadErr.message);
      }
    }

    // Compute financial totals
    const grossPayout = batch.employees.reduce((sum, e) => sum + e.grossEarnings, 0);
    const totalDeductions = batch.employees.reduce((sum, e) => sum + e.totalDeductions, 0);
    const netPayout = batch.employees.reduce((sum, e) => sum + e.calculatedNetPayable, 0);

    // 2. Insert Batch Header
    const batchHeaderPayload: Record<string, any> = {
      batch_name: `${batch.payPeriod} Payroll`,
      pay_period: batch.payPeriod,
      pay_date: batch.employees[0]?.payDate || new Date().toLocaleDateString('en-GB'),
      file_name: batch.fileName,
      total_count: batch.totalCount,
      success_count: batch.successCount,
      failed_count: batch.failedCount,
      gross_payout: grossPayout,
      total_deductions: totalDeductions,
      net_payout: netPayout,
      zip_storage_path: zipStoragePath,
      created_by: 'HR Team',
    };

    if (batch.id && !batch.id.startsWith('batch_')) {
      batchHeaderPayload.id = batch.id;
    }

    const { data: insertedBatch, error: batchErr } = await supabase
      .from('payroll_batches')
      .insert([batchHeaderPayload])
      .select('id')
      .single();

    if (batchErr || !insertedBatch) {
      console.error('Error inserting batch to Supabase:', batchErr);
      return null;
    }

    const assignedBatchId = insertedBatch.id;

    // 3. Bulk Insert Employee Rows
    const empRows = batch.employees.map((emp) => ({
      batch_id: assignedBatchId,
      employee_id: emp.id,
      name: emp.name,
      department: emp.department,
      designation: emp.designation,
      position: emp.position,
      branch: emp.branch,
      location: emp.location,
      mobile: emp.mobile,
      doj: emp.doj,
      dob: emp.dob,
      paid_days: emp.paidDays,
      lop_days: emp.lopDays,
      pay_period: emp.payPeriod,
      pay_date: emp.payDate,
      tax_regime: emp.taxRegime,
      pt_state: emp.ptState,
      uan_number: emp.uanNumber,
      esi_number: emp.esiNumber,
      pf_account_number: emp.pfAccountNumber,
      pan_number: emp.panNumber,
      bank_name: emp.bankName,
      bank_account_number: emp.bankAccountNumber,
      earnings_breakdown: {
        basic: emp.basic,
        hra: emp.hra,
        washingAllowance: emp.washingAllowance,
        incentive: emp.incentive,
        otherAllowance: emp.otherAllowance,
        previousMonth: emp.previousMonth,
        additionalEarnings: emp.additionalEarnings,
        grossEarnings: emp.grossEarnings,
      },
      deductions_breakdown: {
        providentFund: emp.providentFund,
        esi: emp.esi,
        tds: emp.tds,
        professionalTax: emp.professionalTax,
        otherDeduction: emp.otherDeduction,
        additionalDeductions: emp.additionalDeductions,
        totalDeductions: emp.totalDeductions,
      },
      calculated_net_payable: emp.calculatedNetPayable,
      source_net_payable: emp.sourceNetPayable,
      net_mismatch: emp.netMismatch,
      validation_status: emp.validationStatus,
    }));

    // Insert in chunks of 50 to avoid request payload limits
    const chunkSize = 50;
    for (let i = 0; i < empRows.length; i += chunkSize) {
      const chunk = empRows.slice(i, i + chunkSize);
      await supabase.from('payroll_employees').insert(chunk);
    }

    return assignedBatchId;
  } catch (err) {
    console.error('Fatal error saving batch to Supabase:', err);
    return null;
  }
}

export async function downloadStoredZip(storagePath: string, fileName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from('payroll-archives')
      .download(storagePath);

    if (error || !data) {
      console.error('Failed to download ZIP from Supabase Storage:', error);
      return false;
    }

    // Trigger browser download
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('Error downloading stored zip:', err);
    return false;
  }
}

/**
 * Persists an individual employee's payslip to Supabase when downloaded individually.
 * Guarantees that single employee downloads immediately reflect in the database.
 */
export async function saveIndividualEmployeeToSupabase(
  emp: EmployeeRecord,
  template?: PayslipTemplate,
  settings?: CompanySettings
): Promise<string | null> {
  try {
    const payPeriod = template?.payPeriod || emp.payPeriod || 'October 2026';
    const payDate = template?.payDate || emp.payDate || new Date().toLocaleDateString('en-GB');

    // 1. Find or create an active batch for this pay period
    let { data: batch } = await supabase
      .from('payroll_batches')
      .select('id, total_count, success_count')
      .eq('pay_period', payPeriod)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let batchId: string;

    if (!batch) {
      const { data: newBatch, error: batchErr } = await supabase
        .from('payroll_batches')
        .insert([
          {
            batch_name: `${payPeriod} Payroll`,
            pay_period: payPeriod,
            pay_date: payDate,
            file_name: 'Individual_Downloads.xlsx',
            total_count: 1,
            success_count: 1,
            failed_count: 0,
            gross_payout: emp.grossEarnings,
            total_deductions: emp.totalDeductions,
            net_payout: emp.calculatedNetPayable,
            created_by: 'HR Team',
          },
        ])
        .select('id')
        .single();

      if (batchErr || !newBatch) {
        console.error('Failed to create batch for individual employee:', batchErr);
        return null;
      }
      batchId = newBatch.id;
    } else {
      batchId = batch.id;
    }

    // 2. Check if this employee already exists in this batch
    const { data: existingEmp } = await supabase
      .from('payroll_employees')
      .select('id')
      .eq('batch_id', batchId)
      .eq('employee_id', emp.id)
      .maybeSingle();

    const empPayload = {
      batch_id: batchId,
      employee_id: emp.id,
      name: emp.name,
      department: emp.department,
      designation: emp.designation,
      position: emp.position,
      branch: emp.branch,
      location: emp.location,
      mobile: emp.mobile,
      doj: emp.doj,
      dob: emp.dob,
      paid_days: emp.paidDays,
      lop_days: emp.lopDays,
      pay_period: emp.payPeriod || payPeriod,
      pay_date: emp.payDate || payDate,
      tax_regime: emp.taxRegime,
      pt_state: emp.ptState,
      uan_number: emp.uanNumber,
      esi_number: emp.esiNumber,
      pf_account_number: emp.pfAccountNumber,
      pan_number: emp.panNumber,
      bank_name: emp.bankName,
      bank_account_number: emp.bankAccountNumber,
      earnings_breakdown: {
        basic: emp.basic,
        hra: emp.hra,
        washingAllowance: emp.washingAllowance,
        incentive: emp.incentive,
        otherAllowance: emp.otherAllowance,
        previousMonth: emp.previousMonth,
        additionalEarnings: emp.additionalEarnings,
        grossEarnings: emp.grossEarnings,
      },
      deductions_breakdown: {
        providentFund: emp.providentFund,
        esi: emp.esi,
        tds: emp.tds,
        professionalTax: emp.professionalTax,
        otherDeduction: emp.otherDeduction,
        additionalDeductions: emp.additionalDeductions,
        totalDeductions: emp.totalDeductions,
      },
      calculated_net_payable: emp.calculatedNetPayable,
      source_net_payable: emp.sourceNetPayable,
      net_mismatch: emp.netMismatch,
      validation_status: emp.validationStatus,
    };

    if (existingEmp) {
      await supabase.from('payroll_employees').update(empPayload).eq('id', existingEmp.id);
    } else {
      await supabase.from('payroll_employees').insert([empPayload]);
      if (batch) {
        await supabase
          .from('payroll_batches')
          .update({
            total_count: (batch.total_count || 0) + 1,
            success_count: (batch.success_count || 0) + 1,
          })
          .eq('id', batchId);
      }
    }

    return batchId;
  } catch (err) {
    console.error('Fatal error saving individual employee to Supabase:', err);
    return null;
  }
}

/**
 * Clears all batches and employee records from Supabase.
 */
export async function clearAllBatchesFromSupabase(): Promise<boolean> {
  try {
    await supabase.from('payroll_employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('payroll_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return true;
  } catch (err) {
    console.error('Error clearing batches from Supabase:', err);
    return false;
  }
}

