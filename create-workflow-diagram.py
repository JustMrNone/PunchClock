#!/usr/bin/env python3
"""
Script to generate a Git workflow diagram for documentation.
This creates a visualization of the space-themed Git workflow.
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont

def create_git_workflow_diagram():
    """Create a visual diagram of the space-themed Git workflow."""
    try:
        # Create a new image with a dark background
        width, height = 800, 500
        background_color = (30, 30, 40)
        image = Image.new('RGB', (width, height), background_color)
        draw = ImageDraw.Draw(image)
        
        # Try to load a font, fall back to default if not available
        try:
            font_large = ImageFont.truetype("Arial.ttf", 20)
            font_medium = ImageFont.truetype("Arial.ttf", 16)
            font_small = ImageFont.truetype("Arial.ttf", 12)
        except IOError:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Define colors for each stage
        colors = {
            "assembly": (100, 149, 237),  # Cornflower blue
            "testing": (65, 105, 225),    # Royal blue
            "countdown": (30, 144, 255),  # Dodger blue
            "liftoff": (0, 191, 255),     # Deep sky blue
            "orbit": (135, 206, 250)      # Light sky blue
        }
        
        # Draw title
        title = "Punch Clock Space-Themed Git Workflow"
        draw.text((width/2, 30), title, fill=(255, 255, 255), font=font_large, anchor="mm")
        
        # Draw the main development line
        line_y = height - 100
        draw.line([(50, line_y), (width-50, line_y)], fill=(150, 150, 150), width=2)
        
        # Draw arrows on the main line
        for x in range(100, width-100, 100):
            draw.line([(x, line_y-5), (x+10, line_y), (x, line_y+5)], fill=(150, 150, 150), width=1)
        
        # Define stage positions
        stages = [
            {"name": "Assembly", "x": 150, "y": line_y, "color": colors["assembly"], "desc": "Building and planning features"},
            {"name": "Testing", "x": 300, "y": line_y, "color": colors["testing"], "desc": "Integration and verification"},
            {"name": "Countdown", "x": 450, "y": line_y, "color": colors["countdown"], "desc": "Final preparation and validation"},
            {"name": "Liftoff", "x": 600, "y": line_y, "color": colors["liftoff"], "desc": "Full launch"},
            {"name": "Orbit", "x": 650, "y": line_y - 100, "color": colors["orbit"], "desc": "Long-term support and fixes"}
        ]
        
        # Draw each stage
        for stage in stages:
            # Draw circle for the stage
            radius = 20
            draw.ellipse(
                [(stage["x"]-radius, stage["y"]-radius), 
                 (stage["x"]+radius, stage["y"]+radius)], 
                fill=stage["color"]
            )
            
            # Draw stage name
            draw.text(
                (stage["x"], stage["y"] - 40),
                stage["name"],
                fill=(255, 255, 255),
                font=font_medium,
                anchor="mm"
            )
            
            # Draw stage description
            draw.text(
                (stage["x"], stage["y"] - 60),
                stage["desc"],
                fill=(200, 200, 200),
                font=font_small,
                anchor="mm"
            )
        
        # Draw orbit branch
        orbit_x, orbit_y = stages[4]["x"], stages[4]["y"]
        liftoff_x, liftoff_y = stages[3]["x"], stages[3]["y"]
        
        # Draw orbit branch line
        draw.line([(liftoff_x, liftoff_y), (liftoff_x + 30, liftoff_y - 50), 
                   (orbit_x - 30, orbit_y), (orbit_x, orbit_y)], 
                  fill=colors["orbit"], width=2)
        
        # Draw arrow back to liftoff
        draw.line([(orbit_x, orbit_y), (orbit_x - 50, orbit_y + 50), 
                   (liftoff_x + 50, liftoff_y - 20), (liftoff_x + 50, liftoff_y)], 
                  fill=colors["orbit"], width=2)
        
        # Add legend
        legend_y = height - 60
        legend_x = 100
        for i, (stage_name, color) in enumerate(colors.items()):
            # Draw color box
            draw.rectangle(
                [(legend_x + i*150, legend_y), (legend_x + i*150 + 15, legend_y + 15)],
                fill=color
            )
            
            # Draw stage name
            draw.text(
                (legend_x + i*150 + 25, legend_y + 7),
                stage_name.capitalize(),
                fill=(255, 255, 255),
                font=font_small,
                anchor="lm"
            )
        
        # Ensure the docs/img directory exists
        os.makedirs("docs/img", exist_ok=True)
        
        # Save the image
        output_path = "docs/img/git-workflow-diagram.png"
        image.save(output_path)
        print(f"Git workflow diagram created: {output_path}")
        return True
    
    except Exception as e:
        print(f"Error creating Git workflow diagram: {e}")
        return False

if __name__ == "__main__":
    create_git_workflow_diagram()