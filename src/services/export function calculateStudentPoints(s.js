export function calculateStudentPoints(submissions, challenges) {
  let totalPoints = 0;

  submissions.forEach(submission => {
    // Find matching challenge purely by checking if the date falls in the range
    const matchingChallenge = challenges.find(challenge => {
      return submission.date >= challenge.start_date && 
             submission.date <= challenge.end_date;
    });

    if (matchingChallenge) {
      // Add the submission's points (adjust this line if your property is named differently)
      totalPoints += (submission.points || 0);
    }
  });

  return totalPoints;
}
