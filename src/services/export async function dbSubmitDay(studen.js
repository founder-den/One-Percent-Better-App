export async function dbSubmitDay(studentId, date, submissionData) {
  // 1. Duplicate check: ONLY check student_id and date
  const { data: existingSubmission, error: fetchError } = await supabase
    .from('submissions')
    .select('id')
    .eq('student_id', studentId)
    .eq('date', date)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Error checking for duplicates: ${fetchError.message}`);
  }

  if (existingSubmission) {
    throw new Error("A submission already exists for this student on this date.");
  }

  // 2. Insert the new submission (without challenge_id)
  const { data: newSubmission, error: insertError } = await supabase
    .from('submissions')
    .insert([{
      student_id: studentId,
      date: date,
      ...submissionData 
    }])
    .select();

  if (insertError) {
    throw new Error(`Error inserting submission: ${insertError.message}`);
  }

  return newSubmission;
}
