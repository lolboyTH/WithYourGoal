const sidebar = document.querySelector('.sidebar');
const menubar = document.querySelector('.menu-button');
const head = document.querySelector('.head');


menubar.addEventListener('click',showSidebar);
head.addEventListener('click',hideSidebar);

function showSidebar(){
    sidebar.style.display = 'flex'
}
function hideSidebar(){
    sidebar.style.display = 'none'
}