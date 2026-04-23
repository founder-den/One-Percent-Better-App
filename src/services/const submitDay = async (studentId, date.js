const submitDay = async (studentId, date, submissionData) => {
  try {
    // Call dbSubmitDay with only studentId, date, and the data
    const result = await dbSubmitDay(studentId, date, submissionData);
    
    // Update local state if needed (adjust based on your existing setup)
    // setSubmissions(prev => [...prev, result[0]]);
    
    return result;
  } catch (error) {
    console.error("Failed to submit day:", error);
    throw error;
  }
};
