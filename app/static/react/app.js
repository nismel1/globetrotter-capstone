document.addEventListener('DOMContentLoaded', () => {
  const chips = document.querySelectorAll('.chip, .province-pill, .nav-item');

  chips.forEach((chip) => {
    chip.addEventListener('click', (event) => {
      if (chip.classList.contains('nav-item')) {
        document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
        chip.classList.add('active');
        return;
      }

      if (chip.classList.contains('province-pill')) {
        document.querySelectorAll('.province-pill').forEach((item) => item.classList.remove('active'));
        chip.classList.add('active');
        return;
      }

      if (chip.classList.contains('chip')) {
        document.querySelectorAll('.chip').forEach((item) => item.classList.remove('active'));
        chip.classList.add('active');
      }

      event.preventDefault();
    });
  });
});
