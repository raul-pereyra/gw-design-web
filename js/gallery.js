const resizeObserver = new ResizeObserver(entries => {
    for (const { target } of entries) {
      if (target) refreshPerspective(target);
    }
  });
  
  function initSlideshow(slideshow) {
    let [direction, ticking, x1, x2, dragEndInterval] = [-1, false, 0, 0, null];
    
    // Fade in
    slideshow.classList.add("in");
    
    // Observe for changes to slideshow's dimensions
    resizeObserver.observe(slideshow);
    
    // Add scroll event listener
    slideshow.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {  
          const imageToReorder = [...slideshow.children].reduce((prev, current) =>
                    ~direction ? ((Number(prev.style.order) < Number(current.style.order)) ? prev : current)
                      : ((Number(prev.style.order) > Number(current.style.order)) ? prev : current));
          
          // Scrolling right
          if (~direction && (slideshow.scrollLeft > (slideshow.scrollWidth / 2))) {
            slideshow.scrollLeft = slideshow.scrollLeft - imageToReorder.width;
            
            for (const image of [...slideshow.children]) {
              if (image == imageToReorder) image.style.order = slideshow.children.length - 1;
              else image.style.order = image.style.order-1;
            }
          }
          
          // Scrolling left
          else if (!~direction && ((slideshow.scrollLeft + slideshow.clientWidth) < (slideshow.scrollWidth / 2))) {
            slideshow.scrollLeft = slideshow.scrollLeft + imageToReorder.width;
            
            for (const image of [...slideshow.children]) {
              if (image == imageToReorder) imageToReorder.style.order = 0;
              else image.style.order = Number(image.style.order)+1;
            }
          }
          
          ticking = false;
        });
  
        ticking = true;
      }
    });
    
    // Mouse/touch events
    slideshow.onmousedown = dragStart;
    slideshow.addEventListener("touchstart", dragStart);
    slideshow.addEventListener("touchmove", dragAction);
    slideshow.addEventListener("touchend", dragEnd);
    slideshow.addEventListener("mouseleave", dragEnd);
    
    function dragStart(e) {
      e.preventDefault();
      clearInterval(dragEndInterval);
      slideshow.classList.add("dragging");
      
      if (e.type == 'touchstart') {
        x1 = e.touches[0].clientX;
      } else {
        x1 = e.clientX;
        slideshow.onmousemove = dragAction;
        slideshow.onmouseup = dragEnd;
      }
    }
    
    function dragAction(e) {
      if (e.type == 'touchmove') {
        x2 = x1 - e.touches[0].clientX;
        x1 = e.touches[0].clientX;
      } else {
        x2 = x1 - e.clientX;
        x1 = e.clientX;
      }
      
      // Update scroll direction
      const offset = (slideshow.scrollLeft + x2) - slideshow.scrollLeft;
      if (offset) direction = Math.min(Math.max(offset, -1), 1);
      
      // Update scroll position
      slideshow.scrollLeft = (slideshow.scrollLeft + x2);
    }
    
    function dragEnd(e) {
      // Ease down to a stop when letting go
      let velocity = Math.min(Math.max(x2.valueOf(), -25), 25);
      if (x2) {
        x2 = 0;
        clearInterval(dragEndInterval);
        dragEndInterval = setInterval(() => {
          slideshow.scrollLeft = (slideshow.scrollLeft + velocity);
          velocity += ~direction ? -0.2 : 0.2;
          if (~direction ? velocity <= 0 : velocity >= 0) clearInterval(dragEndInterval);
        }, 10);
      }
      
      slideshow.classList.remove("dragging");
      slideshow.onmouseup = null;
      slideshow.onmousemove = null;
    }
  }
  
  function refreshPerspective(slideshow) {
    const perspective = slideshow.getBoundingClientRect().width / 2;
    slideshow.style.perspective = `${perspective}px`;
  
    // Translate each image accordingly
    {
      let perspectiveThreshold = perspective / 4;
      let prevZ = -1;
      for (const [i, image] of [...slideshow.children].entries()) {
        image.dataset.y = image.dataset.y || Math.random();
        image.dataset.z = image.dataset.z || Math.random();
  
        let [y, z] = [
          Math.floor(image.dataset.y * perspectiveThreshold) - (perspectiveThreshold / 2), 
          Math.floor(image.dataset.z * perspectiveThreshold)
        ];
  
        // Readjust z-translation if it's to close.
        while (perspective > 100 && Math.abs(prevZ - z) < (perspectiveThreshold * 0.2)) {
          image.dataset.z = Math.random();
          z = Math.floor(image.dataset.z * perspectiveThreshold);
        }
  
        prevZ = z;
        image.style.cssText = `
          order: ${i};
          transform: translate3d(0, ${y}px, ${z}px);
          z-index: ${z};
        `;
      }
    }
  
    slideshow.scrollLeft = 1; // Offset by 1 to enable left-scrolling initially.
    return perspective;
  }
  
  (async () => {
    // Using a for..of loop in case you want more slideshows on page.
    for (const slideshow of [...document.querySelectorAll(".slideshow")]) {
      // Wait for all images to load before initializing the slideshow
      for (const image of [...slideshow.children]) {
        await new Promise(resolve => {
          if (image.complete) resolve();
          else image.onload = resolve;
        });
      }
      
      // Let's go
      initSlideshow(slideshow);
    }
  })();