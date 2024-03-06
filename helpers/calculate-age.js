class DateCalculator {
  constructor() {}

  calculateBirthDate(yearsAgo) {
    const currentDate = new Date();
    const date = new Date(currentDate);
    date.setFullYear(date.getFullYear() - yearsAgo);
    return date.toISOString();
  }
}

export default new DateCalculator();
