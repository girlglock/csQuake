csQuake is a fan made reimplementation of id
Software's Quake as a Counter Strike 2 workshop
addon. It is free, non-commercial, and not
affiliated with or endorsed by id Software, ZeniMax,
Bethesda, or Valve.

It is built from parts under different licenses,
listed below.


Code
----

The cs_script code is licensed under the GNU General
Public License, version 2. The full text is in the
file LICENSE.

Parts of the game logic are translated from the
original Quake source code:

  Copyright (C) 1996-1999 id Software LLC
  Released under the GNU GPL in 1999.

Translating a program to another language is a
modification under the GPL, so this code is a
derivative work of it.

The workshop addon is distributed as compiled files.
The complete corresponding source (the TypeScript &
panorama sources) is
published at:

  https://github.com/girlglock/csQuake

as GPL v2 section 3 requires.

If you have a copy of this addon and cannot obtain
the corresponding source from the repository above,
the author will, for at least three years from the
date you received your copy, send you the complete
corresponding source for no more than the cost of
delivery. Contact: girlglock@girlglock.com


Maps
----

The Source 2 map files (.vmap) are also licensed
under the GNU General Public License, version 2.

They were built by hand in the Source 2 Hammer editor,
rebuilding each level's layout and Entity IO logic from "The Original
Quake Map Sources":

  Copyright (C) 1996 id Software
  Released by John Romero in October 2006 under the
  GNU GPL, version 2.
  http://rome.ro/resources/

The id .map files are a different format,
and are not part of this project or used at runtime.
The .vmap files were handmade from scratch while reading
the original .map files, so they carry the same license.

That .map release bundles the plain GPL v2 text with
no "or later" grant, so the work here is GPL v2.


Assets
------

These are separate works, not derived from the GPL
code, loaded at runtime. Under GPL v2 section 2 they
are a mere aggregation and keep their own licenses.
They are not covered by the GPL.

Models, sounds, sprites, and world textures come
from LibreQuake:

  https://github.com/lavenderdotpet/LibreQuake

  The models were re-exported and re-baked for
  Source 2; those changes are under the same terms.
  The LibreQuake project is BSD 3-Clause licensed,
  reproduced here as that license requires:

  Copyright (c) 2019-2023
  Contributors to the LibreQuake project.
  All rights reserved.

  Redistribution and use in source and binary forms,
  with or without modification, are permitted
  provided that the following conditions are met:

    * Redistributions of source code must retain the
      above copyright notice, this list of
      conditions and the following disclaimer.
    * Redistributions in binary form must reproduce
      the above copyright notice, this list of
      conditions and the following disclaimer in the
      documentation and/or other materials provided
      with the distribution.
    * Neither the name of the LibreQuake project nor
      the names of its contributors may be used to
      endorse or promote products derived from this
      software without specific prior written
      permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS
  AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
  IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
  FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
  DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
  OF USE, DATA, OR PROFITS; OR BUSINESS
  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
  OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
  ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
  SUCH DAMAGE.

World textures are LibreQuake's set,
keyed to the original map texture names and
covered by the BSD 3-Clause license above. Names
LibreQuake has not painted yet fall back to
"QuadCompati" placeholder art:

  https://github.com/LibreQuake/QuadCompati

  QuadCompati v0.01 textures are CC0 / MIT-0 /
  BSD-0, public domain equivalent, no attribution
  required.

  Every world texture here was resampled to
  2048x2048 with nearest-neighbor. Some carry a
  LibreQuake glow mask wired as self-illum.

The UI: the
menu plaques, and the some cherry picked HUD elements are taken from the
Quake Revitalization Project (QRP):

  http://qrp.quakeone.com

  The QRP textures are copyright their
  respective authors and, collectively, the
  Quake Revitalization Project. They are free
  to use in any project, commercial or
  non-commercial, on the condition that the
  work or derivative product credits the Quake
  Revitalization Project by name and the URL
  above. This file is that credit.


Trademarks and warranty
-----------------------

"Quake", "id Software", "Counter-Strike", "Source",
and "Steam" are trademarks of their respective
owners. Use here is nominative and implies no
endorsement.

This project is provided "as is", with no warranty
of any kind, to the extent permitted by law. See
LICENSE, sections 11 and 12.
